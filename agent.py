"""
agent.py
LiveKit Voice Technical Interviewer Agent for Challenge 1.

Technical Stack:
- Transport & Real-Time Audio: LiveKit SFU (livekit-agents Python SDK)
- Voice Activity Detection (VAD): Silero VAD (barge-in interruption handling)
- Speech-to-Text (STT): Deepgram Nova-2 streaming
- Text-to-Speech (TTS): Cartesia Sonic (ultra-low TTFB)
- Brain & State: OpenAI/vLLM LLM with investigative probing persona and Pydantic state validation
"""

import os
import sys
import json
import logging
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# LiveKit Agents imports
from livekit import rtc
from livekit.agents import (
    cli,
    WorkerOptions,
    JobContext,
    AutoSubscribe,
    AgentSession,
    Agent,
    function_tool,
)
from livekit.plugins import silero, deepgram, cartesia, openai

# Schema imports
from schema import ApplicationForm, InterviewStateUpdate

# Load environment variables (.env.local takes priority, followed by .env)
load_dotenv(".env.local")
load_dotenv(".env")

# Mirror NEXT_PUBLIC_LIVEKIT_URL into LIVEKIT_URL if not directly set
if not os.getenv("LIVEKIT_URL") and os.getenv("NEXT_PUBLIC_LIVEKIT_URL"):
    os.environ["LIVEKIT_URL"] = os.getenv("NEXT_PUBLIC_LIVEKIT_URL")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("interviewer-agent")

# Core System Prompt enforcing investigative technical interviewer persona
SYSTEM_PROMPT = """You are an elite, investigative technical interviewer conducting a structured technical screening for an engineering application.

Your objective is to thoroughly discover, push back on, and validate three specific application fields:
1. `project_name`: The technical name and core purpose of the system built.
2. `personal_ownership`: The exact architectural modules, backend/frontend components, or code the candidate personally wrote or designed (strictly separating individual contribution from collective 'we').
3. `impact_metrics`: Hard quantifiable metrics (e.g., latency numbers, QPS, user scale, percentage gains, cost savings).

CRITICAL CONVERSATIONAL & VOICE PIPELINE RULES:
1. FOCUS ON ONE FIELD AT A TIME:
   - Never ask compound questions or demand multiple fields in a single turn.
   - Recommended order: Project Name -> Personal Ownership -> Impact Metrics.
2. CONCISE & ULTRA-LOW LATENCY:
   - Keep EVERY response under TWO sentences. Short turns ensure crisp latency and natural conversation.
   - Do not lecture or explain your interview rubric to the candidate.
3. INVESTIGATIVE PROBING & FIRM PUSHBACK:
   - If the candidate speaks in vague collective terms ("we built", "our team made"), immediately challenge them: "What specific subsystem or module did YOU personally code or design?"
   - If the candidate provides qualitative results without numbers ("it made it faster", "users liked it", "it was scalable"), immediately challenge them: "What were the concrete numbers? What was the latency reduction, QPS, or scale?"
4. TOOL CALLING & STATE UPDATING:
   - Immediately invoke the `update_application_form` tool when the candidate supplies verified details.
   - Once all three fields are satisfied with concrete evidence, congratulate them briefly, state that their application draft is complete, and set `ready_for_review=True`.
"""


class InterviewAgent(Agent):
    """
    Agent implementation equipped with state-updating tools and the investigative prompt.
    """
    def __init__(self, form: ApplicationForm, output_path: str = "application_draft.json"):
        self.form = form
        self.output_path = output_path
        self.room: Optional[rtc.Room] = None
        super().__init__(
            instructions=SYSTEM_PROMPT,
        )

    def set_room(self, room: rtc.Room) -> None:
        """Sets the active room to publish real-time form updates to the frontend UI."""
        self.room = room

    def _sync_save_draft(self) -> None:
        """Thread-safe synchronous snapshot saving."""
        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(self.form.to_draft_json())

    @function_tool
    async def update_application_form(
        self,
        project_name: Optional[str] = None,
        personal_ownership: Optional[str] = None,
        impact_metrics: Optional[str] = None,
        ready_for_review: Optional[bool] = None,
    ) -> str:
        """
        Record or update fields on the candidate's application form state.
        Call this tool as soon as the candidate provides verified details.

        Args:
            project_name: The verified name and summary of the project.
            personal_ownership: Specific components personally coded or designed by candidate.
            impact_metrics: Quantifiable outcomes (latency, QPS, percentages, user numbers).
            ready_for_review: Set to True once all 3 fields are thoroughly validated.
        """
        logger.info(
            f"Tool call update_application_form args: project_name={project_name}, "
            f"personal_ownership={personal_ownership}, impact_metrics={impact_metrics}, "
            f"ready_for_review={ready_for_review}"
        )

        updated = self.form.update_fields(
            project_name=project_name,
            personal_ownership=personal_ownership,
            impact_metrics=impact_metrics,
            ready_for_review=ready_for_review,
        )

        missing = self.form.missing_fields()

        # Non-blocking async file write offloaded to thread
        try:
            await asyncio.to_thread(self._sync_save_draft)
            logger.info(f"Draft updated and saved asynchronously to {self.output_path}")
        except Exception as e:
            logger.error(f"Failed to save draft to {self.output_path}: {e}")

        # Broadcast real-time form state to frontend via LiveKit Data Channel
        if self.room and self.room.local_participant:
            try:
                payload = json.dumps(self.form.model_dump()).encode("utf-8")
                await self.room.local_participant.publish_data(payload, reliable=True, topic="form_update")
                logger.info("Published form update to LiveKit room data channel")
            except Exception as pe:
                logger.warning(f"Could not publish data packet to room: {pe}")

        if not missing and self.form.ready_for_review:
            return "Application form is fully complete, validated with metrics and ownership! Ready for final review."

        next_focus = missing[0] if missing else "final confirmation"
        return f"Form updated with {list(updated.keys())}. Missing fields remaining: {missing}. Next probe target: {next_focus}."


class VoicePipelineAgent:
    """
    Full-duplex Voice Pipeline Agent wrapping:
    - Silero VAD (voice activity detection and barge-in interruption handling)
    - Deepgram Nova-2 streaming STT
    - Cartesia Sonic ultra-low TTFB TTS
    - OpenAI / vLLM LLM
    - LiveKit AgentSession
    - Pydantic ApplicationForm state
    """
    def __init__(
        self,
        form: Optional[ApplicationForm] = None,
        output_draft_path: str = "application_draft.json",
        allow_interruptions: bool = True,
        openai_model: Optional[str] = None,
    ):
        self.form = form or ApplicationForm()
        self.output_draft_path = output_draft_path
        env_allow_interrupt = os.getenv("ALLOW_INTERRUPTIONS", "true").lower() == "true"
        self.allow_interruptions = allow_interruptions and env_allow_interrupt

        self._check_environment_credentials()

        # 1. Silero VAD for low-latency barge-in
        logger.info("Initializing Silero VAD plugin...")
        self.vad = silero.VAD.load(
            min_speech_duration=0.05,
            min_silence_duration=0.45,
            prefix_padding_duration=0.3,
        )

        # 2. Deepgram STT (Nova-2 streaming)
        deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
        deepgram_model = os.getenv("DEEPGRAM_MODEL", "nova-2")
        logger.info(f"Initializing Deepgram STT ({deepgram_model})...")
        self.stt = deepgram.STT(
            model=deepgram_model,
            language="en-US",
            interim_results=True,
            punctuate=True,
            smart_format=True,
            api_key=deepgram_api_key or None,
        )

        # 3. Cartesia TTS (Sonic ultra-low TTFB)
        cartesia_api_key = os.getenv("CARTESIA_API_KEY")
        cartesia_model = os.getenv("CARTESIA_MODEL", "sonic")
        cartesia_voice = os.getenv("CARTESIA_VOICE", "f786b574-daa5-4673-aa0c-cbe3e8534c02")
        logger.info(f"Initializing Cartesia TTS ({cartesia_model})...")
        self.tts = cartesia.TTS(
            model=cartesia_model,
            voice=cartesia_voice,
            api_key=cartesia_api_key or None,
        )

        # 4. OpenAI / vLLM LLM
        openai_api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", None)
        model = openai_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        logger.info(f"Initializing LLM ({model})...")
        self.llm = openai.LLM(
            model=model,
            api_key=openai_api_key or None,
            base_url=base_url or None,
            temperature=0.2,
        )

        # 5. Core Interview Agent and LiveKit AgentSession
        self.interview_agent = InterviewAgent(self.form, output_path=self.output_draft_path)
        self.session = AgentSession(
            vad=self.vad,
            stt=self.stt,
            llm=self.llm,
            tts=self.tts,
            allow_interruptions=self.allow_interruptions,
        )

    def _check_environment_credentials(self) -> None:
        """Validates presence of essential environment variables and logs warnings if missing."""
        required_keys = {
            "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
            "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
            "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
            "DEEPGRAM_API_KEY": os.getenv("DEEPGRAM_API_KEY"),
            "CARTESIA_API_KEY": os.getenv("CARTESIA_API_KEY"),
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        }
        missing = [key for key, val in required_keys.items() if not val or "your_" in val]
        if missing:
            logger.warning(
                f"Missing or placeholder credentials in environment: {missing}. "
                "Ensure these are defined in .env before joining live sessions."
            )

    async def start(self, room: rtc.Room) -> None:
        """Starts the agent session attached to the room."""
        logger.info("Starting AgentSession attached to LiveKit room...")
        self.interview_agent.set_room(room)
        self.session.start(agent=self.interview_agent, room=room)

    async def greet(self) -> None:
        """Plays initial interviewer greeting with full interruption support."""
        greeting_text = (
            "Hi there! I'm your technical interviewer today. "
            "To begin your application review, what project did you build that you'd like to discuss?"
        )
        logger.info(f"Speaking initial greeting (allow_interruptions={self.allow_interruptions})...")
        await self.session.say(greeting_text, allow_interruptions=self.allow_interruptions)

    def save_draft(self) -> str:
        """Writes current form state to structured JSON draft synchronously."""
        with open(self.output_draft_path, "w", encoding="utf-8") as f:
            f.write(self.form.to_draft_json())
        return self.output_draft_path

    async def async_save_draft(self) -> str:
        """Non-blocking asynchronous draft saver."""
        await asyncio.to_thread(self.save_draft)
        return self.output_draft_path


async def entrypoint(ctx: JobContext):
    """
    LiveKit Agents Worker Entrypoint.
    Connects to SFU room, waits for participant, and starts voice pipeline.
    """
    logger.info(f"Starting job in room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    logger.info("Waiting for candidate participant to connect...")
    participant = await ctx.wait_for_participant()
    logger.info(f"Candidate connected: identity={participant.identity}, name={participant.name}")

    # Launch VoicePipelineAgent
    pipeline = VoicePipelineAgent(output_draft_path="application_draft.json")
    await pipeline.start(ctx.room)
    await pipeline.greet()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
