"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant,
  useRoomContext,
  useConnectionState,
  BarVisualizer,
} from "@livekit/components-react";
import {
  ConnectionState,
  RoomEvent,
  Track,
  RemoteParticipant,
  LocalParticipant,
  DataPacket_Kind,
} from "livekit-client";
import { ApplicationFormState, ConnectionStatus } from "./types";
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  User,
  Bot,
  Sparkles,
  Wifi,
  WifiOff,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface InterviewRoomProps {
  token: string;
  serverUrl: string;
  form: ApplicationFormState;
  onFormUpdate: (updated: Partial<ApplicationFormState>) => void;
  onDisconnect: () => void;
  onOpenReview: () => void;
}

/**
 * Inner component active inside <LiveKitRoom>
 */
const RoomSessionContent: React.FC<{
  form: ApplicationFormState;
  onFormUpdate: (updated: Partial<ApplicationFormState>) => void;
  onDisconnect: () => void;
  onOpenReview: () => void;
}> = ({ form, onFormUpdate, onDisconnect, onOpenReview }) => {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const voiceAssistant = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const [isMuted, setIsMuted] = useState(!isMicrophoneEnabled);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Sync mute state
  useEffect(() => {
    setIsMuted(!isMicrophoneEnabled);
  }, [isMicrophoneEnabled]);

  // Toggle microphone
  const toggleMic = async () => {
    if (localParticipant) {
      const target = !isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(target);
      setIsMuted(!target);
    }
  };

  // Listen to LiveKit Room Data Channel packets & connection state from python agent
  useEffect(() => {
    if (!room) return;

    const handleData = (
      payload: Uint8Array,
      participant?: RemoteParticipant | LocalParticipant,
      kind?: DataPacket_Kind,
      topic?: string
    ) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        if (
          data &&
          (data.project_name !== undefined ||
            data.personal_ownership !== undefined ||
            data.impact_metrics !== undefined ||
            data.ready_for_review !== undefined)
        ) {
          onFormUpdate(data);
        }
      } catch (err: unknown) {
        console.warn("Data packet parsing error:", err);
      }
    };

    const handleReconnecting = () => setIsReconnecting(true);
    const handleReconnected = () => setIsReconnecting(false);

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
    };
  }, [room, onFormUpdate]);

  // Determine interviewer status
  const isAgentSpeaking = voiceAssistant.state === "speaking";
  const isUserSpeaking = localParticipant?.isSpeaking ?? false;

  const statusBadge = useMemo(() => {
    if (isReconnecting) {
      return {
        label: "Reconnecting…",
        colorClasses: "bg-amber-500/10 text-amber-300 border-amber-500/25",
        dotColor: "bg-amber-400",
        pulse: true,
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
      };
    }
    if (connectionState === ConnectionState.Connecting) {
      return {
        label: "Connecting to SFU…",
        colorClasses: "bg-amber-500/10 text-amber-300 border-amber-500/25",
        dotColor: "bg-amber-400",
        pulse: true,
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
      };
    }
    if (connectionState === ConnectionState.Connected) {
      if (form.ready_for_review) {
        return {
          label: "Interview Complete",
          colorClasses: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
          dotColor: "bg-emerald-400",
          pulse: false,
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      }
      if (isAgentSpeaking) {
        return {
          label: "Interviewer Speaking",
          colorClasses: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
          dotColor: "bg-indigo-400",
          pulse: true,
          icon: <Bot className="w-3 h-3" />,
        };
      }
      if (isUserSpeaking) {
        return {
          label: "Candidate Speaking",
          colorClasses: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
          dotColor: "bg-indigo-400",
          pulse: true,
          icon: <User className="w-3 h-3" />,
        };
      }
      return {
        label: "Listening…",
        colorClasses: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
        dotColor: "bg-indigo-400",
        pulse: true,
        icon: <Wifi className="w-3 h-3" />,
      };
    }
    return {
      label: "Disconnected",
      colorClasses: "bg-zinc-800/80 text-zinc-400 border-zinc-700/50",
      dotColor: "bg-zinc-500",
      pulse: false,
      icon: <WifiOff className="w-3 h-3" />,
    };
  }, [connectionState, isAgentSpeaking, isUserSpeaking, form.ready_for_review, isReconnecting]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/70 rounded-2xl shadow-2xl overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-800/70 bg-zinc-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Animated radio icon badge */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
            <Radio className="w-4 h-4" />
            <span className="absolute inset-0 rounded-xl animate-ping bg-indigo-500/10" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              Live Voice Session
              <span className="hidden 2xl:inline text-[10px] font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded tracking-wider">
                Silero • Deepgram Nova-2 • Cartesia Sonic
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Full-duplex real-time audio · barge-in enabled</p>
          </div>
        </div>

        {/* Status badge */}
        <div
          role="status"
          className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-300 ${statusBadge.colorClasses}`}
        >
          {statusBadge.icon}
          <span
            className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor} ${statusBadge.pulse ? "animate-pulse" : ""}`}
          />
          {statusBadge.label}
        </div>
      </div>

      {/* ── Main Stage ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[420px] py-12 px-5 space-y-10 relative overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950">

        {/* Ambient background glow */}
        <div
          className={`absolute inset-0 transition-all duration-1000 pointer-events-none ${
            isAgentSpeaking
              ? "bg-[radial-gradient(ellipse_at_50%_40%,rgba(99,102,241,0.06)_0%,transparent_70%)]"
              : isUserSpeaking
              ? "bg-[radial-gradient(ellipse_at_50%_40%,rgba(99,102,241,0.06)_0%,transparent_70%)]"
              : "bg-transparent"
          }`}
        />

        {/* Speaker Orb with glow rings */}
        <div className="relative flex items-center justify-center">
          {/* Outer diffuse ring */}
          <div
            className={`absolute rounded-full transition-all duration-700 ease-in-out ${
              isAgentSpeaking
                ? "w-60 h-60 bg-indigo-500/10 scale-110 animate-pulse"
                : isUserSpeaking
                ? "w-60 h-60 bg-indigo-500/10 scale-110 animate-pulse"
                : "w-48 h-48 bg-zinc-800/20 scale-100"
            }`}
          />
          {/* Mid ring */}
          <div
            className={`absolute rounded-full border transition-all duration-500 ease-in-out ${
              isAgentSpeaking
                ? "w-44 h-44 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                : isUserSpeaking
                ? "w-44 h-44 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                : "w-36 h-36 border-zinc-700/30"
            }`}
          />
          {/* Inner tight ring */}
          <div
            className={`absolute rounded-full border transition-all duration-300 ${
              isAgentSpeaking
                ? "w-32 h-32 border-indigo-400/40"
                : isUserSpeaking
                ? "w-32 h-32 border-indigo-400/40"
                : "w-28 h-28 border-zinc-700/20"
            }`}
          />

          {/* Central Orb */}
          <div
            className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ease-out ${
              isAgentSpeaking
                ? "bg-gradient-to-br from-indigo-600 to-indigo-400 text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] scale-105"
                : isUserSpeaking
                ? "bg-gradient-to-br from-indigo-600 to-violet-400 text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] scale-105"
                : "bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 scale-100"
            }`}
          >
            {isAgentSpeaking ? (
              <>
                <Bot className="w-9 h-9 drop-shadow" />
                <span className="text-[9px] font-bold tracking-widest uppercase mt-1 opacity-90">Speaking</span>
              </>
            ) : isUserSpeaking ? (
              <>
                <User className="w-9 h-9 drop-shadow" />
                <span className="text-[9px] font-bold tracking-widest uppercase mt-1 opacity-90">You</span>
              </>
            ) : (
              <>
                <Bot className="w-8 h-8" />
                <span className="text-[9px] font-medium tracking-widest uppercase mt-1">Listening</span>
              </>
            )}
          </div>
        </div>

        {/* Audio Wave Visualizer */}
        <div className="w-full max-w-xs flex flex-col items-center gap-2.5">
          {voiceAssistant.audioTrack ? (
            <div
              className={`h-10 w-full flex items-center justify-center transition-colors duration-300 ${
                isAgentSpeaking ? "text-indigo-400" : "text-indigo-400"
              }`}
            >
              <BarVisualizer
                state={voiceAssistant.state}
                barCount={20}
                trackRef={voiceAssistant.audioTrack}
                className="interview-visualizer h-10 w-full"
              />
            </div>
          ) : (
            <div className="flex items-end gap-1 h-10">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isUserSpeaking
                      ? "bg-indigo-400 animate-pulse"
                      : isAgentSpeaking
                      ? "bg-indigo-400 animate-pulse"
                      : "bg-zinc-700"
                  }`}
                  style={{
                    height: isAgentSpeaking || isUserSpeaking
                      ? `${Math.max(8, Math.sin(i * 0.8) * 24 + 16)}px`
                      : "4px",
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              ))}
            </div>
          )}

          <p className="text-[11px] text-zinc-400 font-medium tracking-wide text-center">
            {isAgentSpeaking
              ? "Interviewer speaking — you can barge in"
              : isUserSpeaking
              ? "Receiving your voice stream…"
              : "Speak naturally to answer the question"}
          </p>
        </div>

        {/* Probing rule reminder pill */}
        <div className="max-w-md w-full px-4 py-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 backdrop-blur-sm">
          <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
            <span className="text-indigo-400 font-semibold">Probing rule: </span>
            Avoid collective &ldquo;we&rdquo; — specify your exact code ownership and concrete numbers (latency ms, QPS, scale %).
          </p>
        </div>
      </div>

      {/* ── Control Bar ── */}
      <div className="px-5 py-4 border-t border-zinc-800/70 bg-zinc-900/50 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
        {/* Mic toggle */}
        <button
          type="button"
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          aria-pressed={isMuted}
          disabled={connectionState !== ConnectionState.Connected}
          onClick={toggleMic}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
            isMuted
              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50"
              : "bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
          }`}
        >
          {isMuted
            ? <MicOff className="w-4 h-4 text-rose-400 shrink-0" />
            : <Mic className="w-4 h-4 text-emerald-400 shrink-0" />}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Review draft button — only shows when ready */}
          {form.ready_for_review && (
            <button
              type="button"
              onClick={onOpenReview}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-xs font-semibold transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Review Draft
            </button>
          )}

          {/* End interview */}
          <button
            type="button"
            onClick={() => {
              if (room) room.disconnect();
              onDisconnect();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all duration-200"
          >
            <PhoneOff className="w-4 h-4 shrink-0" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* LiveKit Audio Renderer for playback */}
      <RoomAudioRenderer />
    </div>
  );
};

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  token,
  serverUrl,
  form,
  onFormUpdate,
  onDisconnect,
  onOpenReview,
}) => {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={onDisconnect}
      className="h-full w-full"
    >
      <RoomSessionContent
        form={form}
        onFormUpdate={onFormUpdate}
        onDisconnect={onDisconnect}
        onOpenReview={onOpenReview}
      />
    </LiveKitRoom>
  );
};
