"""
test_interviewer.py
Verification & Local Testing Script for LiveKit Voice Technical Interviewer Agent.

Features:
1. Automated unit test suite verifying Pydantic state model and strict probing rules.
2. Simulated conversation harness testing multi-turn pushback on vague answers.
3. Structured Pydantic JSON draft generation and verification.
4. Optional interactive terminal test mode.
"""

import sys
import os
import json
import re
import unittest
from typing import List, Dict, Tuple, Optional
from dotenv import load_dotenv

# Load env
load_dotenv()

from schema import ApplicationForm, InterviewStateUpdate
from agent import SYSTEM_PROMPT, InterviewAgent


class InterviewSimulationHarness:
    """
    Simulates real-time conversational voice text-stream turns between
    the candidate and the interviewer agent.
    """
    def __init__(self, output_path: str = "test_application_draft.json"):
        self.form = ApplicationForm()
        self.output_path = output_path
        self.conversation_history: List[Dict[str, str]] = []

    def get_next_question(self) -> str:
        """Determines the appropriate probing question based on current state."""
        missing = self.form.missing_fields()
        if not self.form.project_name:
            return "To get started on your application, what project did you build that you'd like to discuss?"
        elif "personal_ownership" in missing:
            return "What specific subsystem, architecture, or code did YOU personally design or implement?"
        elif "impact_metrics" in missing:
            return "What were the concrete numbers? Can you share the latency reduction, QPS, or user scale?"
        else:
            return "Thank you! All key details have been thoroughly validated. Your application draft is ready for review."

    def process_candidate_turn(self, candidate_input: str) -> Tuple[str, ApplicationForm]:
        """
        Simulates receiving a transcribed voice turn from the candidate,
        evaluates ownership & metrics, updates the Pydantic model,
        and generates the agent's pushback or next probe.
        """
        self.conversation_history.append({"role": "candidate", "content": candidate_input})
        missing_before = self.form.missing_fields()

        # Step 1: Probe for project name if missing
        if not self.form.project_name:
            # Extract or assign project name
            self.form.update_fields(project_name=candidate_input.strip())
            response = "Got it. What specific subsystem or code did YOU personally design or implement?"
            self.conversation_history.append({"role": "interviewer", "content": response})
            return response, self.form

        # Step 2: Probe for personal ownership if missing or incomplete
        if "personal_ownership" in missing_before:
            if ApplicationForm.is_ownership_sufficient(candidate_input):
                self.form.update_fields(personal_ownership=candidate_input.strip())
                response = "Understood on your personal ownership. What were the concrete impact metrics, such as latency, scale, or user numbers?"
            else:
                # PUSHBACK on vague or collective ownership
                response = "That describes the broader project or team effort. What specific part did YOU personally code or architect?"
            self.conversation_history.append({"role": "interviewer", "content": response})
            return response, self.form

        # Step 3: Probe for impact metrics if missing or incomplete
        if "impact_metrics" in missing_before:
            if ApplicationForm.is_metrics_sufficient(candidate_input):
                self.form.update_fields(impact_metrics=candidate_input.strip())
                self.form.ready_for_review = True
                # Export draft
                with open(self.output_path, "w", encoding="utf-8") as f:
                    f.write(self.form.to_draft_json())
                response = "Excellent, those numbers give a clear picture of impact. Your application draft is now complete and ready for review!"
            else:
                # PUSHBACK on qualitative or non-numeric claims
                response = "Could you give me the exact metrics? What was the measured latency, throughput, or user scale in numbers?"
            self.conversation_history.append({"role": "interviewer", "content": response})
            return response, self.form

        response = "Your application draft has already been verified and submitted for review."
        self.conversation_history.append({"role": "interviewer", "content": response})
        return response, self.form


class TestInterviewerAgent(unittest.TestCase):
    """
    Automated test suite verifying Pydantic schema validation,
    probing behavior, pushback on vague answers, and JSON draft export.
    """

    def setUp(self):
        self.output_file = "test_verified_draft.json"
        if os.path.exists(self.output_file):
            try:
                os.remove(self.output_file)
            except OSError:
                pass

    def tearDown(self):
        if os.path.exists(self.output_file):
            try:
                os.remove(self.output_file)
            except OSError:
                pass

    def test_schema_initial_state(self):
        """Verify new ApplicationForm is empty and flags all 3 fields as missing."""
        form = ApplicationForm()
        self.assertFalse(form.is_complete())
        self.assertFalse(form.ready_for_review)
        self.assertEqual(form.missing_fields(), ["project_name", "personal_ownership", "impact_metrics"])

    def test_vague_ownership_pushback(self):
        """Verify that collective 'we' or vague statements fail ownership validation."""
        vague_cases = [
            "We built a great backend service together.",
            "Our team worked on the distributed storage layer.",
            "We did it in two sprints.",
            "team effort",
        ]
        for text in vague_cases:
            self.assertFalse(
                ApplicationForm.is_ownership_sufficient(text),
                f"Expected '{text}' to fail ownership validation."
            )

    def test_concrete_ownership_acceptance(self):
        """Verify that individual first-person engineering contributions pass."""
        concrete_cases = [
            "I personally designed the caching layer and wrote the eviction policy in Go.",
            "I authored the streaming audio WebRTC pipeline and WebSocket handler.",
            "I implemented the payment checkout service and database schema.",
        ]
        for text in concrete_cases:
            self.assertTrue(
                ApplicationForm.is_ownership_sufficient(text),
                f"Expected '{text}' to pass ownership validation."
            )

    def test_vague_metrics_pushback(self):
        """Verify that qualitative claims without numbers fail metrics validation."""
        vague_metrics = [
            "It was super fast and customers loved it.",
            "We improved performance a lot.",
            "Greatly increased user satisfaction.",
            "It scaled really well across the cloud.",
        ]
        for text in vague_metrics:
            self.assertFalse(
                ApplicationForm.is_metrics_sufficient(text),
                f"Expected '{text}' to fail metrics validation."
            )

    def test_concrete_metrics_acceptance(self):
        """Verify that quantifiable metrics with numbers/percentages pass."""
        concrete_metrics = [
            "Reduced p99 latency from 140ms to 12ms and handled 35,000 QPS.",
            "Cut AWS cloud costs by 32% saving $45,000 per month.",
            "Scaled from zero to 250,000 daily active users with 99.99% uptime.",
            "Processed five thousand requests per second with zero data loss.",
        ]
        for text in concrete_metrics:
            self.assertTrue(
                ApplicationForm.is_metrics_sufficient(text),
                f"Expected '{text}' to pass metrics validation."
            )

    def test_multi_turn_simulation_with_pushback(self):
        """
        Simulate an end-to-end multi-turn interview dialogue where the candidate
        first gives vague answers, receives pushback, clarifies, and reaches completion.
        """
        harness = InterviewSimulationHarness(output_path=self.output_file)

        # Turn 1: Candidate gives project
        resp1, form = harness.process_candidate_turn("High-throughput Event Streaming Gateway")
        self.assertEqual(form.project_name, "High-throughput Event Streaming Gateway")
        self.assertIn("personal_ownership", form.missing_fields())
        self.assertIn("personally", resp1.lower())

        # Turn 2: Candidate provides vague ownership ("We built...")
        resp2, form = harness.process_candidate_turn("We built the Kafka ingestion pipeline as a team.")
        self.assertIn("personal_ownership", form.missing_fields(), "Vague ownership should not satisfy form.")
        self.assertIn("personally", resp2.lower(), "Interviewer must push back on vague collective ownership.")

        # Turn 3: Candidate provides concrete personal ownership
        resp3, form = harness.process_candidate_turn(
            "I personally architected the memory-mapped ring buffer and wrote the zero-copy deserializer in Rust."
        )
        self.assertNotIn("personal_ownership", form.missing_fields(), "Concrete ownership should satisfy field.")
        self.assertIn("impact_metrics", form.missing_fields())
        self.assertIn("metrics", resp3.lower())

        # Turn 4: Candidate provides vague metrics ("it was fast")
        resp4, form = harness.process_candidate_turn("It was really fast and handled all our company traffic.")
        self.assertIn("impact_metrics", form.missing_fields(), "Vague metrics should not satisfy form.")
        self.assertIn("metrics", resp4.lower())

        # Turn 5: Candidate provides hard numbers
        resp5, form = harness.process_candidate_turn(
            "It handled 120,000 events per second with sub-5ms p99 latency and zero packet loss."
        )
        self.assertNotIn("impact_metrics", form.missing_fields(), "Concrete metrics should satisfy field.")
        self.assertTrue(form.is_complete())
        self.assertTrue(form.ready_for_review)
        self.assertIn("ready for review", resp5.lower())

        # Verify JSON draft output on disk
        self.assertTrue(os.path.exists(self.output_file), "Draft JSON file should be saved on disk.")
        with open(self.output_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data["project_name"], "High-throughput Event Streaming Gateway")
        self.assertIn("zero-copy deserializer", data["personal_ownership"])
        self.assertIn("120,000 events", data["impact_metrics"])
        self.assertTrue(data["ready_for_review"])

    def test_edge_case_empty_and_whitespace(self):
        """Verify handling of empty strings, whitespace, and None."""
        self.assertFalse(ApplicationForm.is_ownership_sufficient(""))
        self.assertFalse(ApplicationForm.is_ownership_sufficient("   \n\t  "))
        self.assertFalse(ApplicationForm.is_ownership_sufficient(None))
        self.assertFalse(ApplicationForm.is_metrics_sufficient(""))
        self.assertFalse(ApplicationForm.is_metrics_sufficient("   \t  "))
        self.assertFalse(ApplicationForm.is_metrics_sufficient(None))

    def test_mixed_team_and_personal_ownership(self):
        """Verify that personal ownership overrides broader team mentions."""
        statement = "Our team had 8 engineers, but I solely designed and implemented the raft consensus state machine."
        self.assertTrue(ApplicationForm.is_ownership_sufficient(statement))

    def test_edge_case_special_characters_and_punctuation(self):
        """Verify metrics with percentages, currency, and punctuation."""
        metrics_cases = [
            "Cut AWS cloud costs by 35.5% (approx. $12,500/mo).",
            "Maintained 99.999% SLA across 4 regions.",
            "Sub-millisecond (0.8ms) query response time.",
        ]
        for m in metrics_cases:
            self.assertTrue(ApplicationForm.is_metrics_sufficient(m))

    def test_pydantic_roundtrip_serialization(self):
        """Verify round-trip JSON serialization and schema reconstruction."""
        form = ApplicationForm(
            project_name="High-throughput Gateway",
            personal_ownership="I architected the streaming pipeline and network socket pool.",
            impact_metrics="Handled 50,000 requests per second with 15ms p99 latency.",
            ready_for_review=True,
        )
        json_str = form.to_draft_json()
        restored = ApplicationForm.model_validate_json(json_str)
        self.assertEqual(form.project_name, restored.project_name)
        self.assertEqual(form.personal_ownership, restored.personal_ownership)
        self.assertEqual(form.impact_metrics, restored.impact_metrics)
        self.assertTrue(restored.is_complete())


def run_interactive_harness():
    """Interactive command-line simulation mode to test the interviewer live."""
    print("\n" + "=" * 60)
    print(" LIVEKIT TECHNICAL INTERVIEWER - INTERACTIVE TEST HARNESS")
    print("=" * 60)
    harness = InterviewSimulationHarness()
    print(f"\n[Interviewer]: {harness.get_next_question()}\n")

    while not harness.form.is_complete():
        try:
            user_input = input("[Candidate]: ")
        except (EOFError, KeyboardInterrupt):
            print("\nExiting interactive harness.")
            break

        if not user_input.strip():
            continue

        response, form = harness.process_candidate_turn(user_input)
        print(f"\n[Interviewer]: {response}\n")
        print(f"--- State: Missing {form.missing_fields()} | Complete: {form.is_complete()} ---\n")

    if harness.form.is_complete():
        print("=" * 60)
        print("FINAL VERIFIED APPLICATION DRAFT (PYDANTIC JSON):")
        print("=" * 60)
        print(harness.form.to_draft_json())


if __name__ == "__main__":
    if "--interactive" in sys.argv:
        run_interactive_harness()
    else:
        print("Running Interviewer Agent Verification Tests...")
        unittest.main(argv=[sys.argv[0], "-v"])
