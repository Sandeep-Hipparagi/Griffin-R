"use client";

import React, { useState, useCallback } from "react";
import { InterviewRoom } from "@/components/InterviewRoom";
import { TavusRoom } from "@/components/TavusRoom";
import { FormPreview } from "@/components/FormPreview";
import { ReviewModal } from "@/components/ReviewModal";
import { ApplicationFormState } from "@/components/types";
import {
  Mic,
  Video,
  Bot,
  Radio,
  FileCode,
  ShieldCheck,
  Play,
  Settings2,
  ExternalLink,
  Info,
  Sparkles,
  Layers,
  KeyRound,
} from "lucide-react";

type InterviewEngine = "tavus" | "livekit";

export default function Home() {
  const [engine, setEngine] = useState<InterviewEngine>("tavus");

  // LiveKit state
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://your-livekit-instance.livekit.cloud"
  );
  const [roomName, setRoomName] = useState<string>("challenge-1-interview");
  const [candidateName, setCandidateName] = useState<string>("Alex Morgan");

  // Tavus CVI state
  const [palId, setPalId] = useState<string>(
    process.env.NEXT_PUBLIC_TAVUS_PAL_ID || "p8c17a8f2901"
  );
  const [tavusConversation, setTavusConversation] = useState<{
    conversation_id: string;
    conversation_url: string;
  } | null>(null);
  const [tavusTestMode, setTavusTestMode] = useState<boolean>(false);
  const [customEmbedUrl, setCustomEmbedUrl] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Application form state (matching Pydantic ApplicationForm)
  const [form, setForm] = useState<ApplicationFormState>({
    project_name: null,
    personal_ownership: null,
    impact_metrics: null,
    ready_for_review: false,
  });

  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  // Start LiveKit Audio interview
  const startLiveKitInterview = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomName,
          name: candidateName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to fetch LiveKit token");
      }

      setToken(data.token);
      if (data.wsUrl) {
        setServerUrl(data.wsUrl);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      console.error("LiveKit token error:", err);
      setErrorMessage(
        `${message}. Please check LIVEKIT credentials in .env.local`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start Tavus Video CVI interview using PAL ID
  const startTavusInterview = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // If custom embed/hosted URL provided directly
    if (customEmbedUrl.trim()) {
      setTavusConversation({
        conversation_id: `custom-${Date.now()}`,
        conversation_url: customEmbedUrl.trim(),
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tavus/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pal_id: palId,
          conversation_name: `Interview - ${candidateName}`,
          test_mode: tavusTestMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.mockUrl) {
          // Provide direct demo fallback if no API key is yet configured
          setErrorMessage(
            `${data.error} ${data.details}`
          );
        }
        throw new Error(data.details || data.error || "Failed to create Tavus conversation");
      }

      setTavusConversation({
        conversation_id: data.conversation_id,
        conversation_url: data.conversation_url,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start Tavus interview";
      console.error("Tavus CVI error:", err);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect handler
  const handleDisconnect = () => {
    setToken(null);
    setTavusConversation(null);
  };

  // Live state update callback from data channel or simulation
  const handleFormUpdate = useCallback((updated: Partial<ApplicationFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...updated };
      // If ready_for_review was not explicitly set in the incoming update,
      // dynamically evaluate whether all three fields meet validation criteria
      if (updated.ready_for_review === undefined) {
        const isProjectValid = Boolean(next.project_name && next.project_name.trim().length >= 3);
        const isOwnershipValid = Boolean(next.personal_ownership && next.personal_ownership.trim().length >= 8);
        const isMetricsValid = Boolean(next.impact_metrics && next.impact_metrics.trim().length >= 4);

        if (isProjectValid && isOwnershipValid && isMetricsValid) {
          next.ready_for_review = true;
        }
      }
      return next;
    });
  }, []);

  // Developer simulation helper for testing without live voice credentials
  const handleSimulateField = (field: keyof ApplicationFormState, value: any) => {
    handleFormUpdate({ [field]: value });
  };

  const isCallActive = Boolean(token || tavusConversation);

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 text-zinc-100">
      {/* Top Navbar */}
      <header className="border-b border-borderDark/80 bg-surface/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-indigo-500/20 font-bold text-sm">
              <Bot className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100 flex flex-wrap items-center gap-2">
                Personal Technical Interviewer
                <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Interview workspace
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400">
                Tavus CVI Video Human • LiveKit SFU Audio • Real-Time Pydantic Sync
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Engine switcher tab (disabled during active call) */}
            {!isCallActive && (
              <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  type="button"
                  aria-pressed={engine === "tavus"}
                  disabled={isLoading}
                  onClick={() => setEngine("tavus")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                    engine === "tavus"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Tavus Video PAL</span>
                </button>
                <button
                  type="button"
                  aria-pressed={engine === "livekit"}
                  disabled={isLoading}
                  onClick={() => setEngine("livekit")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                    engine === "livekit"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>LiveKit Audio</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setIsReviewOpen(true)}
              aria-label="Review application draft"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceElevated hover:bg-zinc-700 border border-borderDark text-xs font-medium text-zinc-200 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">Review Draft</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {/* Error notification if credentials missing */}
        {errorMessage && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-rose-200 mb-0.5">Configuration Notice</p>
                <p>{errorMessage}</p>
                <p className="mt-1 text-zinc-400">
                  You can get your API key from the{" "}
                  <a
                    href="https://maker.tavus.io/dev/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-brand-400 hover:text-brand-300"
                  >
                    Tavus API Keys page
                  </a>
                  , or paste a direct Hosted Link / Embed URL below.
                </p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-stretch">
          {/* Left Column: Active Room or Pre-join Hero (7 cols) */}
          <div className="lg:col-span-7 min-w-0 flex flex-col h-full">
            {tavusConversation ? (
              /* Tavus CVI Active Room */
              <TavusRoom
                conversationUrl={tavusConversation.conversation_url}
                conversationId={tavusConversation.conversation_id}
                palId={palId}
                form={form}
                onDisconnect={handleDisconnect}
                onOpenReview={() => setIsReviewOpen(true)}
              />
            ) : token ? (
              /* LiveKit Active Room */
              <InterviewRoom
                token={token}
                serverUrl={serverUrl}
                form={form}
                onFormUpdate={handleFormUpdate}
                onDisconnect={handleDisconnect}
                onOpenReview={() => setIsReviewOpen(true)}
              />
            ) : engine === "tavus" ? (
              /* Tavus Pre-join Hero Card */
              <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 xl:p-8 bg-surface border border-borderDark rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="space-y-6">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                    <Video className="w-3.5 h-3.5" />
                    <span>Tavus Conversational Video Interface (CVI)</span>
                  </div>

                  {/* Heading */}
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                      Interview with Digital Human PAL
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                      Face-to-face AI technical interview powered by your custom Tavus PAL (<span className="text-emerald-400 font-mono font-semibold">{palId}</span>). The digital human avatar probes your responses, pushes back on vague team statements, and demands quantifiable metrics.
                    </p>
                  </div>

                  {/* Tech specs bullet list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                        PAL Persona ID
                      </span>
                      <p className="text-xs text-zinc-300 font-mono">
                        {palId} (Personal Interviewer Agent)
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                        Conversational Video
                      </span>
                      <p className="text-xs text-zinc-300">
                        Ultra-realistic lip-sync and dynamic expressions.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider block">
                        Live Pydantic Validation
                      </span>
                      <p className="text-xs text-zinc-300">
                        Tracks project, personal ownership, and impact metrics.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                        Hosted Link & Embed
                      </span>
                      <p className="text-xs text-zinc-300">
                        Runs embedded or in standalone browser window.
                      </p>
                    </div>
                  </div>

                  {/* Configuration Inputs */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="setup-1" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Tavus PAL ID
                      </label>
                      <input id="setup-1"
                        type="text"
                        value={palId}
                        onChange={(e) => setPalId(e.target.value)}
                        placeholder="p8c17a8f2901"
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-400 transition font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="setup-2" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Candidate Name
                      </label>
                      <input id="setup-2"
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-400 transition"
                      />
                    </div>
                  </div>

                  {/* Optional Direct Hosted Link or Embed Input */}
                  <details className="text-xs text-zinc-400 border border-zinc-800/80 rounded-lg p-2.5 bg-zinc-900/40">
                    <summary className="cursor-pointer font-medium text-zinc-400 hover:text-zinc-200 flex items-center justify-between">
                      <span>Direct Hosted Link / Custom Embed URL</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Optional</span>
                    </summary>
                    <div className="mt-2.5 pt-2 border-t border-zinc-800 space-y-2">
                      <p className="text-[11px] text-zinc-400">
                        Paste a direct Tavus conversation link (e.g. <code>https://tavus.daily.co/c...</code>) to launch directly without API key:
                      </p>
                      <input
                        aria-label="Direct hosted interview URL"
                        type="url"
                        value={customEmbedUrl}
                        onChange={(e) => setCustomEmbedUrl(e.target.value)}
                        placeholder="https://tavus.daily.co/c123456"
                        className="w-full px-3 py-1.5 text-xs rounded bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-400 font-mono"
                      />
                    </div>
                  </details>
                </div>

                {/* Launch Button */}
                <div className="pt-8 flex flex-col xl:flex-row items-center gap-4">
                  <button
                    type="button"
                    onClick={startTavusInterview}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50"
                  >
                    <Video className="w-4 h-4 text-zinc-950" />
                    <span>{isLoading ? "Launching PAL Session..." : "Start Tavus Video Interview"}</span>
                  </button>

                  <a
                    href="https://maker.tavus.io/dev/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Get Tavus API Key</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            ) : (
              /* LiveKit Pre-join Hero Card */
              <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 xl:p-8 bg-surface border border-borderDark rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="space-y-6">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Investigative Technical Screening Agent</span>
                  </div>

                  {/* Heading */}
                  <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                      Low-Latency Audio Screening
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                      Speak directly to the AI interviewer over LiveKit SFU. The agent enforces strict probing rules: pushing back on vague collective claims (&ldquo;we built&rdquo;) and demanding concrete ownership and quantifiable metrics.
                    </p>
                  </div>

                  {/* Tech specs bullet list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider block">
                        Voice Activity Detection
                      </span>
                      <p className="text-xs text-zinc-300">
                        Silero VAD with instant barge-in interruption support.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                        Streaming Speech Stack
                      </span>
                      <p className="text-xs text-zinc-300">
                        Deepgram Nova-2 streaming STT & Cartesia Sonic TTS.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                        Investigative Persona
                      </span>
                      <p className="text-xs text-zinc-300">
                        Under 2-sentence turns, single-field focus, strict metric pushback.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surfaceElevated/50 border border-zinc-800 space-y-1">
                      <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                        Live Pydantic Sync
                      </span>
                      <p className="text-xs text-zinc-300">
                        Data packets streamed dynamically into the UI preview.
                      </p>
                    </div>
                  </div>

                  {/* Candidate configuration */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="setup-3" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Candidate Name
                      </label>
                      <input id="setup-3"
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-brand-400 transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="setup-4" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                        LiveKit SFU Room
                      </label>
                      <input id="setup-4"
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-brand-400 transition font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-8 flex flex-col xl:flex-row items-center gap-4">
                  <button
                    type="button"
                    onClick={startLiveKitInterview}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50"
                  >
                    <Mic className="w-4 h-4 text-zinc-950" />
                    <span>{isLoading ? "Connecting to SFU..." : "Start LiveKit Audio Interview"}</span>
                  </button>

                  <p className="text-xs text-zinc-400 text-center sm:text-left">
                    Requires microphone access. Audio streams directly to your LiveKit SFU.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Form State Side-Panel (5 cols) */}
          <div className="lg:col-span-5 min-w-0 flex flex-col h-full">
            <FormPreview
              form={form}
              onOpenReview={() => setIsReviewOpen(true)}
              onSimulateUpdate={handleSimulateField}
            />
          </div>
        </div>
      </main>

      {/* Human Review & Submission Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        form={form}
        onSaveForm={(updated) => setForm(updated)}
      />
    </div>
  );
}
