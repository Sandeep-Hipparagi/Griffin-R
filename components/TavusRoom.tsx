"use client";

import React, { useState } from "react";
import { ApplicationFormState } from "./types";
import {
  Video,
  PhoneOff,
  ExternalLink,
  Sparkles,
  Bot,
  ShieldCheck,
  RefreshCw,
  Maximize2,
} from "lucide-react";

interface TavusRoomProps {
  conversationUrl: string;
  conversationId: string;
  palId?: string;
  form: ApplicationFormState;
  onDisconnect: () => void;
  onOpenReview: () => void;
}

export const TavusRoom: React.FC<TavusRoomProps> = ({
  conversationUrl,
  conversationId,
  palId = "p8c17a8f2901",
  form,
  onDisconnect,
  onOpenReview,
}) => {
  const [isEnding, setIsEnding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      if (conversationId && !conversationId.startsWith("mock-")) {
        await fetch(`/api/tavus/conversations/${encodeURIComponent(conversationId)}/end`, {
          method: "POST",
        });
      }
    } catch (err) {
      console.warn("Error calling end conversation API:", err);
    } finally {
      setIsEnding(false);
      onDisconnect();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-surface border border-borderDark rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
        isFullscreen ? "fixed inset-4 z-50 bg-background" : ""
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-borderDark/80 bg-surface/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Video className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Tavus Digital Human Interviewer
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                PAL ID: {palId}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Conversational Video Interface (CVI) • Personal Interviewer Agent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={conversationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Hosted Link</span>
          </a>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Iframe Video Container */}
      <div className="flex-1 relative bg-black/90 flex items-center justify-center min-h-[420px]">
        <iframe
          title="Tavus Conversational Video Interface"
          src={conversationUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0 absolute inset-0"
        />
      </div>

      {/* Probing Tip Banner */}
      <div className="px-4 py-2 bg-surfaceElevated/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px]">
            <strong className="text-slate-100 font-medium">Interviewer Focus:</strong> Tell the digital human what you personally built. Provide concrete latency, QPS, or scale metrics!
          </span>
        </div>
        {form.ready_for_review && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Draft Complete
          </span>
        )}
      </div>

      {/* Control Footer */}
      <div className="p-4 border-t border-borderDark/80 bg-surface/90 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>CVI Video Stream Connected</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenReview}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              form.ready_for_review
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 animate-pulse"
                : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>{form.ready_for_review ? "Review & Submit Draft" : "Inspect Pydantic Draft"}</span>
          </button>

          <button
            type="button"
            disabled={isEnding}
            onClick={handleEnd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition disabled:opacity-50"
          >
            {isEnding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
            <span>{isEnding ? "Ending..." : "End Call"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
