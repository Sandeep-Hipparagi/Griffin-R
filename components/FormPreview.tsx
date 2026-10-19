"use client";

import React from "react";
import { ApplicationFormState } from "./types";
import {
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  BarChart3,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface FormPreviewProps {
  form: ApplicationFormState;
  onOpenReview: () => void;
  onSimulateUpdate?: <K extends keyof ApplicationFormState>(
    field: K,
    value: ApplicationFormState[K]
  ) => void;
}

interface FieldCardProps {
  index: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  accentColor: string;
  value: string | null | undefined;
  emptyHint: string;
  validatedLabel: string;
  mono?: boolean;
}

const FieldCard: React.FC<FieldCardProps> = ({
  index,
  label,
  sublabel,
  icon,
  accentColor,
  value,
  emptyHint,
  validatedLabel,
  mono,
}) => {
  const filled = Boolean(value?.trim());

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all duration-300 ease-in-out ${
        filled
          ? "bg-zinc-800/50 border-zinc-600/50 shadow-sm"
          : "bg-zinc-900/30 border-zinc-800/60 hover:border-zinc-700/60"
      }`}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-all duration-500 ${
          filled ? accentColor : "bg-zinc-700/30"
        }`}
      />

      <div className="pl-3">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold transition-all duration-300 ${
                filled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {index}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`transition-colors duration-300 ${
                  filled ? "text-zinc-300" : "text-zinc-400"
                }`}
              >
                {icon}
              </span>
              <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                {label}
              </span>
            </div>
          </div>

          {/* Status pill */}
          {filled ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-fade-up">
              <CheckCircle2 className="w-3 h-3" />
              {validatedLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <Clock className="w-3 h-3" />
              Pending
            </span>
          )}
        </div>

        <p className="mb-2 text-xs text-zinc-400">{sublabel}</p>
        {/* Content area */}
        <div className="min-h-[40px] flex items-start">
          {filled ? (
            <p
              key={value}
              className={`animate-fade-up min-w-0 whitespace-pre-wrap break-words text-sm text-zinc-200 leading-relaxed ${
                mono ? "font-mono text-xs text-emerald-300" : ""
              }`}
            >
              {value}
            </p>
          ) : (
            <p className="text-[11px] italic text-zinc-400 leading-relaxed">
              {emptyHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const FormPreview: React.FC<FormPreviewProps> = ({
  form,
  onOpenReview,
  onSimulateUpdate,
}) => {
  const fields = [
    Boolean(form.project_name?.trim()),
    Boolean(form.personal_ownership?.trim()),
    Boolean(form.impact_metrics?.trim()),
  ];
  const completedCount = fields.filter(Boolean).length;
  const progressPct = Math.round((completedCount / 3) * 100);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/70 rounded-2xl shadow-2xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800/70 bg-zinc-900/30 backdrop-blur-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[11px] font-bold tracking-widest text-zinc-300 uppercase">
                Application draft
              </h2>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Live sync · LiveKit SFU data channel
              </p>
            </div>
          </div>

          {/* Status badge */}
          {form.ready_for_review ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ready for Review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Probing ({completedCount}/3)
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
              Completion
            </span>
            <span
              className={`text-[11px] font-bold tabular-nums transition-colors duration-300 ${
                form.ready_for_review
                  ? "text-emerald-400"
                  : progressPct > 0
                  ? "text-indigo-400"
                  : "text-zinc-400"
              }`}
            >
              {progressPct}%
            </span>
          </div>
          <div role="progressbar" aria-label="Application completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct} className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden border border-zinc-700/30">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-in-out ${
                form.ready_for_review
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  : "bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-0.5">
            {fields.map((done, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                    done
                      ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]"
                      : "bg-zinc-700"
                  }`}
                />
                {i < fields.length - 1 && (
                  <div
                    className={`flex-1 h-px transition-all duration-500 ${
                      done ? "bg-emerald-600/40" : "bg-zinc-800"
                    }`}
                    style={{ width: "clamp(16px, 4vw, 80px)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Field Cards ── */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        <FieldCard
          index={1}
          label="Project Name"
          sublabel="What was built"
          icon={<FileText className="w-3.5 h-3.5" />}
          accentColor="bg-indigo-400"
          value={form.project_name}
          emptyHint={`Agent will ask: "What project did you build that you'd like to discuss?"`}
          validatedLabel="Captured"
        />
        <FieldCard
          index={2}
          label="Personal Ownership"
          sublabel="Individual contribution"
          icon={<Layers className="w-3.5 h-3.5" />}
          accentColor="bg-violet-400"
          value={form.personal_ownership}
          emptyHint={`Strict check: Rejects collective "we". Demands modules you personally coded or architected.`}
          validatedLabel="Validated"
        />
        <FieldCard
          index={3}
          label="Impact Metrics"
          sublabel="Quantified outcomes"
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          accentColor="bg-emerald-400"
          value={form.impact_metrics}
          emptyHint="Strict check: Rejects qualitative claims. Requires latency ms, QPS, scale, or % figures."
          validatedLabel="Quantified"
          mono
        />

        {/* Dev simulation helper */}
        {onSimulateUpdate && (
          <div className="pt-1">
            <details className="border border-zinc-800/60 rounded-xl bg-zinc-900/30">
              <summary className="cursor-pointer px-3.5 py-2.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-300 flex flex-wrap items-center justify-between gap-2 transition-colors duration-150 select-none">
                <span>UI Demo Simulation</span>
                <span className="text-[9px] font-bold text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded tracking-wider">
                  DEV
                </span>
              </summary>
              <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-800/60 space-y-1.5">
                {[
                  {
                    label: "Fill Project Name",
                    field: "project_name" as const,
                    value: "Distributed Voice Streaming Engine",
                  },
                  {
                    label: "Fill Personal Ownership",
                    field: "personal_ownership" as const,
                    value:
                      "I architected the WebRTC audio relay and personally implemented the jitter buffer in Rust.",
                  },
                  {
                    label: "Fill Impact Metrics",
                    field: "impact_metrics" as const,
                    value:
                      "Reduced end-to-end voice latency by 42% (180ms) and scaled to 50,000 concurrent sessions.",
                  },
                ].map(({ label, field, value }) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => onSimulateUpdate(field, value)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-[11px] font-medium transition-all duration-150 border border-zinc-700/40 hover:border-zinc-600/60"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* ── Footer CTA ── */}
      <div className="px-4 py-4 border-t border-zinc-800/70 bg-zinc-900/30">
        <button
          type="button"
          onClick={onOpenReview}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 ${
            form.ready_for_review
              ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.35)]"
              : "bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 hover:border-zinc-600/80"
          }`}
        >
          <Sparkles
            className={`w-4 h-4 shrink-0 ${
              form.ready_for_review ? "text-white" : "text-indigo-400"
            }`}
          />
          <span>
            {form.ready_for_review
              ? "Review & Submit Application"
              : "Review Application Draft"}
          </span>
          <ArrowRight className="w-4 h-4 shrink-0 opacity-60" />
        </button>
      </div>
    </div>
  );
};
