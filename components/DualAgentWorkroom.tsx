"use client";

import React, { useState, useEffect } from "react";
import {
  Video,
  Mic,
  PhoneOff,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Bot,
  User,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Settings,
  Play,
  Camera,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface AgentSessionState {
  conversationId: string | null;
  conversationUrl: string | null;
  isLoading: boolean;
  error: string | null;
  customUrl: string;
}

interface DualAgentWorkroomProps {
  onOpenReview?: () => void;
}

export const DualAgentWorkroom: React.FC<DualAgentWorkroomProps> = ({
  onOpenReview,
}) => {
  // Agent A: Technical Interviewer (Active Screener)
  const [screenerPalId, setScreenerPalId] = useState<string>("p8c17a8f2901");
  const [screener, setScreener] = useState<AgentSessionState>({
    conversationId: null,
    conversationUrl: null,
    isLoading: false,
    error: null,
    customUrl: "",
  });

  // Agent B: Candidate Agent (Sharma G)
  const [candidatePalId, setCandidatePalId] = useState<string>("pf2b3ec33d64");
  const [candidate, setCandidate] = useState<AgentSessionState>({
    conversationId: null,
    conversationUrl: null,
    isLoading: false,
    error: null,
    customUrl: "",
  });

  // Global settings & permissions
  const [isDualLaunching, setIsDualLaunching] = useState<boolean>(false);
  const [isEndingAll, setIsEndingAll] = useState<boolean>(false);
  const [fullscreenPane, setFullscreenPane] = useState<"screener" | "candidate" | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Permission verification status
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");

  // Check initial media permissions if supported
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((micStatus) => {
          if (micStatus.state === "granted") {
            setMediaPermissionStatus("granted");
          } else if (micStatus.state === "denied") {
            setMediaPermissionStatus("denied");
          }
        })
        .catch(() => {
          // Permissions API query not supported for microphone on some browsers
        });
    }
  }, []);

  // Explicitly prompt user for Camera and Microphone access
  const requestMediaPermissions = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMediaPermissionStatus("granted");
        // Release tracks immediately since this is only a permission handshake
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn("User declined or browser blocked media permissions:", err);
      setMediaPermissionStatus("denied");
    }
  };

  // Launch a single agent conversation
  const launchAgent = async (
    role: "screener" | "candidate",
    palId: string,
    conversationName: string,
    customUrl: string
  ): Promise<{ conversationId: string; conversationUrl: string } | null> => {
    const setTarget = role === "screener" ? setScreener : setCandidate;

    setTarget((prev) => ({ ...prev, isLoading: true, error: null }));

    // Direct URL override if provided
    if (customUrl.trim()) {
      const result = {
        conversationId: `custom-${Date.now()}-${role}`,
        conversationUrl: customUrl.trim(),
      };
      setTarget((prev) => ({
        ...prev,
        isLoading: false,
        conversationId: result.conversationId,
        conversationUrl: result.conversationUrl,
      }));
      return result;
    }

    try {
      const res = await fetch("/api/tavus/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pal_id: palId,
          conversation_name: conversationName,
          test_mode: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || `Failed to launch ${role} session`);
      }

      setTarget((prev) => ({
        ...prev,
        isLoading: false,
        conversationId: data.conversation_id,
        conversationUrl: data.conversation_url,
      }));

      return {
        conversationId: data.conversation_id,
        conversationUrl: data.conversation_url,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setTarget((prev) => ({ ...prev, isLoading: false, error: msg }));
      return null;
    }
  };

  // End an active conversation
  const endAgent = async (role: "screener" | "candidate") => {
    const target = role === "screener" ? screener : candidate;
    const setTarget = role === "screener" ? setScreener : setCandidate;

    if (target.conversationId && !target.conversationId.startsWith("custom-")) {
      try {
        await fetch(
          `/api/tavus/conversations/${encodeURIComponent(target.conversationId)}/end`,
          { method: "POST" }
        );
      } catch (err) {
        console.warn(`Error ending ${role} conversation:`, err);
      }
    }

    setTarget((prev) => ({
      ...prev,
      conversationId: null,
      conversationUrl: null,
      isLoading: false,
      error: null,
    }));
  };

  // Master Toggle: Launch both sessions concurrently
  const handleLaunchDualSession = async () => {
    setIsDualLaunching(true);

    // Prompt user for media access if not already verified
    if (mediaPermissionStatus !== "granted") {
      await requestMediaPermissions();
    }

    await Promise.allSettled([
      launchAgent("screener", screenerPalId, "Active Technical Screener", screener.customUrl),
      launchAgent("candidate", candidatePalId, "Candidate - Sharma G", candidate.customUrl),
    ]);

    setIsDualLaunching(false);
  };

  // Master Toggle: End both sessions cleanly
  const handleEndDualSession = async () => {
    setIsEndingAll(true);
    await Promise.allSettled([endAgent("screener"), endAgent("candidate")]);
    setIsEndingAll(false);
    setFullscreenPane(null);
  };

  const isAnyActive = Boolean(screener.conversationUrl || candidate.conversationUrl);
  const areBothActive = Boolean(screener.conversationUrl && candidate.conversationUrl);

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      {/* ── Control Header & Master Actions ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-zinc-800 to-emerald-500/20 border border-zinc-700 text-zinc-100 shadow-md">
            <Video className="w-5 h-5 text-indigo-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              Dual-Agent Tavus Workroom
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
                Screener ⚔️ Sharma G
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Side-by-side interactive technical interview room with simultaneous camera and microphone streaming
            </p>
          </div>
        </div>

        {/* Master Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Permission Prompt Button / Status */}
          <button
            type="button"
            onClick={requestMediaPermissions}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
              mediaPermissionStatus === "granted"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                : mediaPermissionStatus === "denied"
                ? "bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750"
            }`}
            title="Click to verify browser Camera & Microphone permissions"
          >
            {mediaPermissionStatus === "granted" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Permissions Allowed</span>
              </>
            ) : mediaPermissionStatus === "denied" ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Camera/Mic Blocked</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Check Cam & Mic</span>
              </>
            )}
          </button>

          {/* PAL Configuration Toggle */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2.5 rounded-xl border text-xs font-medium transition ${
              showConfig
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700 hover:bg-zinc-750"
            }`}
            title="Configure PAL IDs & Custom URLs"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Master Launch / End Button */}
          {isAnyActive ? (
            <button
              type="button"
              disabled={isEndingAll}
              onClick={handleEndDualSession}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all duration-200 disabled:opacity-50"
            >
              {isEndingAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneOff className="w-4 h-4" />
              )}
              <span>{isEndingAll ? "Ending All..." : "End Dual Session"}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isDualLaunching}
              onClick={handleLaunchDualSession}
              className="flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 hover:from-indigo-400 hover:via-sky-400 hover:to-emerald-400 active:opacity-90 text-zinc-950 text-xs font-extrabold shadow-xl shadow-sky-500/20 transition-all duration-200 disabled:opacity-50"
            >
              {isDualLaunching ? (
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
              ) : (
                <Play className="w-4 h-4 fill-zinc-950" />
              )}
              <span>{isDualLaunching ? "Mounting Both Agents..." : "Launch Dual Session"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Optional Configuration Bar ── */}
      {showConfig && (
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 animate-fade-up">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <span>Session Configuration & PAL IDs</span>
            <span className="text-[10px] text-zinc-500 normal-case">
              Defaults set to Technical Interviewer & Sharma G
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Screener Config */}
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-indigo-500/30 space-y-2">
              <span className="text-indigo-400 font-semibold block">
                Pane A: Technical Screener (PAL ID)
              </span>
              <input
                type="text"
                value={screenerPalId}
                onChange={(e) => setScreenerPalId(e.target.value)}
                placeholder="p8c17a8f2901"
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs focus:outline-none focus:border-indigo-400"
              />
              <input
                type="url"
                value={screener.customUrl}
                onChange={(e) =>
                  setScreener((prev) => ({ ...prev, customUrl: e.target.value }))
                }
                placeholder="Direct Hosted Link override (optional)"
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Candidate Config */}
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-emerald-500/30 space-y-2">
              <span className="text-emerald-400 font-semibold block">
                Pane B: Candidate Sharma G (PAL ID)
              </span>
              <input
                type="text"
                value={candidatePalId}
                onChange={(e) => setCandidatePalId(e.target.value)}
                placeholder="pf2b3ec33d64"
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs focus:outline-none focus:border-emerald-400"
              />
              <input
                type="url"
                value={candidate.customUrl}
                onChange={(e) =>
                  setCandidate((prev) => ({ ...prev, customUrl: e.target.value }))
                }
                placeholder="Direct Hosted Link override (optional)"
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px] focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Media Permission Notice Banner ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong className="text-zinc-100">Live Device Access:</strong> Both embed frames include explicit{" "}
            <code className="text-[11px] text-sky-300 bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-800/50">
              allow=&quot;camera; microphone; autoplay; display-capture; clipboard-write&quot;
            </code>{" "}
            attributes so you can speak to and interact with both avatars in real-time.
          </span>
        </div>
        {mediaPermissionStatus === "denied" && (
          <span className="text-rose-400 font-semibold flex items-center gap-1 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            Check browser address bar to unblock
          </span>
        )}
      </div>

      {/* ── Dual-Pane Responsive Grid Layout (h-[80vh]) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[580px] lg:h-[80vh] items-stretch">
        {/* ─────────────────────────────────────────────────────────────
            PANE A: TECHNICAL INTERVIEWER AGENT (Active Screener)
           ───────────────────────────────────────────────────────────── */}
        <div
          className={`flex flex-col bg-[#0d1524] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            fullscreenPane === "screener"
              ? "fixed inset-4 z-50 bg-[#0d1524] shadow-[0_0_80px_rgba(99,102,241,0.2)]"
              : fullscreenPane === "candidate"
              ? "hidden lg:flex lg:opacity-30"
              : ""
          }`}
        >
          {/* Pane Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-indigo-500/20 bg-zinc-900/70 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    🤖 Active Screener
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50 truncate">
                    PAL: {screenerPalId}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Investigative Technical Interviewer · Pushing back on vague answers
                </p>
              </div>
            </div>

            {/* Pane Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {screener.conversationUrl && (
                <a
                  href={screener.conversationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition"
                  title="Open Hosted Link in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() =>
                  setFullscreenPane(fullscreenPane === "screener" ? null : "screener")
                }
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition"
                title={fullscreenPane === "screener" ? "Exit Fullscreen" : "Maximize Pane"}
              >
                {fullscreenPane === "screener" ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Pane Stage / Iframe View */}
          <div className="flex-1 relative bg-black/95 flex flex-col items-center justify-center overflow-hidden min-h-[360px]">
            {screener.conversationUrl ? (
              <iframe
                title="Technical Interviewer Agent"
                src={screener.conversationUrl}
                allow="camera; microphone; autoplay; display-capture; clipboard-write"
                allowFullScreen
                className="w-full h-full border-0 absolute inset-0"
              />
            ) : screener.isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm font-semibold text-zinc-200">
                  Connecting to Active Screener PAL ({screenerPalId})…
                </p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Provisioning WebRTC video feed with ultra-low latency lip-sync
                </p>
              </div>
            ) : (
              /* Idle Standby Screen */
              <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-200">
                    Interviewer Agent Standby
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Ready to intake candidate answers, probe project ownership, and validate hard engineering metrics.
                  </p>
                </div>
                {screener.error && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
                    {screener.error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    launchAgent("screener", screenerPalId, "Active Technical Screener", screener.customUrl)
                  }
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Start Screener Only
                </button>
              </div>
            )}
          </div>

          {/* Pane Footer Status Bar */}
          <div className="px-4 py-2.5 border-t border-indigo-500/20 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  screener.conversationUrl
                    ? "bg-indigo-400 animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="text-[11px]">
                {screener.conversationUrl ? "Live CVI Video Connected" : "Interviewer Idle"}
              </span>
            </div>

            {screener.conversationUrl && (
              <button
                type="button"
                onClick={() => endAgent("screener")}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            PANE B: CANDIDATE AGENT — SHARMA G (PAL ID: pf2b3ec33d64)
           ───────────────────────────────────────────────────────────── */}
        <div
          className={`flex flex-col bg-[#0c1917] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            fullscreenPane === "candidate"
              ? "fixed inset-4 z-50 bg-[#0c1917] shadow-[0_0_80px_rgba(16,185,129,0.2)]"
              : fullscreenPane === "screener"
              ? "hidden lg:flex lg:opacity-30"
              : ""
          }`}
        >
          {/* Pane Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-emerald-500/20 bg-zinc-900/70 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    👤 Candidate: Sharma G
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50 truncate">
                    PAL: {candidatePalId}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Digital Human Candidate Avatar · Real-time verbal response & engagement
                </p>
              </div>
            </div>

            {/* Pane Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {candidate.conversationUrl && (
                <a
                  href={candidate.conversationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition"
                  title="Open Hosted Link in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() =>
                  setFullscreenPane(fullscreenPane === "candidate" ? null : "candidate")
                }
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition"
                title={fullscreenPane === "candidate" ? "Exit Fullscreen" : "Maximize Pane"}
              >
                {fullscreenPane === "candidate" ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Pane Stage / Iframe View */}
          <div className="flex-1 relative bg-black/95 flex flex-col items-center justify-center overflow-hidden min-h-[360px]">
            {candidate.conversationUrl ? (
              <iframe
                title="Candidate Agent - Sharma G"
                src={candidate.conversationUrl}
                allow="camera; microphone; autoplay; display-capture; clipboard-write"
                allowFullScreen
                className="w-full h-full border-0 absolute inset-0"
              />
            ) : candidate.isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm font-semibold text-zinc-200">
                  Connecting Candidate Sharma G ({candidatePalId})…
                </p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Provisioning digital human candidate avatar stream with full duplex audio
                </p>
              </div>
            ) : (
              /* Idle Standby Screen */
              <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-200">
                    Candidate Sharma G Standby
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Representing the software engineer candidate ready to present project experience, answer questions, and defend architectural decisions.
                  </p>
                </div>
                {candidate.error && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
                    {candidate.error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    launchAgent("candidate", candidatePalId, "Candidate - Sharma G", candidate.customUrl)
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Start Sharma G Only
                </button>
              </div>
            )}
          </div>

          {/* Pane Footer Status Bar */}
          <div className="px-4 py-2.5 border-t border-emerald-500/20 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  candidate.conversationUrl
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="text-[11px]">
                {candidate.conversationUrl ? "Live CVI Video Connected" : "Candidate Idle"}
              </span>
            </div>

            {candidate.conversationUrl && (
              <button
                type="button"
                onClick={() => endAgent("candidate")}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
