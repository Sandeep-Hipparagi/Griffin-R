"use client";

import React, { useState, useEffect, useRef } from "react";
import { ApplicationFormState } from "./types";
import {
  X,
  CheckCircle,
  Copy,
  Check,
  Edit3,
  Code,
  FileCheck,
  Send,
  Sparkles,
  Lock,
  ShieldCheck,
} from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ApplicationFormState;
  onSaveForm: (updated: ApplicationFormState) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  form,
  onSaveForm,
}) => {
  const [activeTab, setActiveTab] = useState<"edit" | "json">("edit");
  const [editedForm, setEditedForm] = useState<ApplicationFormState>({ ...form });
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const wasOpen = useRef(false);
  // Snapshot on opening; live updates must not overwrite an active edit.
  useEffect(() => {
    if (isOpen && !wasOpen.current && !isSubmitted) setEditedForm({ ...form });
    wasOpen.current = isOpen;
  }, [isOpen, isSubmitted, form]);

  // Trigger animation after mount
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Keep keyboard focus inside the dialog and restore the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex="0"]'
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isSubmitted) dialogRef.current?.focus();
  }, [isOpen, isSubmitted]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(editedForm, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApproveAndSubmit = () => {
    if (isSubmitted || !editedForm.project_name?.trim() || !editedForm.personal_ownership?.trim() || !editedForm.impact_metrics?.trim()) return;
    const finalForm: ApplicationFormState = {
      project_name: editedForm.project_name?.trim() || null,
      personal_ownership: editedForm.personal_ownership?.trim() || null,
      impact_metrics: editedForm.impact_metrics?.trim() || null,
      ready_for_review: true,
    };
    onSaveForm(finalForm);
    setEditedForm(finalForm);
    const id = `APP-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    setSubmissionId(id);
    setIsSubmitted(true);
  };

  const inputClasses =
    "w-full px-3.5 py-2.5 text-sm rounded-xl bg-zinc-900/80 border border-zinc-700/60 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all duration-200 resize-y";

  return (
    /* Backdrop */
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overscroll-contain transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      } bg-black/60 backdrop-blur-md`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className={`outline-none w-full max-w-2xl bg-zinc-950 border border-zinc-700/50 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] transition-all duration-300 ease-out ${
          isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
        }`}
        style={{ overscrollBehavior: "contain" }}
      >
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-zinc-800/70 bg-zinc-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border ${
                isSubmitted
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
              }`}
            >
              {isSubmitted ? <ShieldCheck className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3
                id="review-modal-title"
                className="text-base font-semibold tracking-tight text-zinc-100"
              >
                {isSubmitted ? "Application Approved" : "Human Review & Draft Approval"}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isSubmitted
                  ? "Your reviewed draft is locked for this session"
                  : "Inspect, edit STT transcripts, and finalize your submission"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close review modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Content ── */}
        {isSubmitted ? (
          /* Success State */
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8 py-8 flex flex-col items-center text-center space-y-5">
            {/* Success icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-[0_0_32px_rgba(16,185,129,0.15)]">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xl font-bold tracking-tight text-zinc-100">
                Application Approved!
              </h4>
              <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
                Your edits have been saved to this dashboard. The approved draft is locked for this session.
              </p>
            </div>

            {/* Verification ID */}
            <div className="flex-wrap justify-center break-all px-4 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl text-xs font-mono text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Review ID:</span>
              <span className="text-zinc-200 font-semibold">{submissionId}</span>
            </div>

            {/* Locked record */}
            <div className="w-full max-w-md text-left p-4 rounded-xl bg-zinc-900/60 border border-zinc-700/50 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Approved application record
              </div>
              <pre className="whitespace-pre-wrap break-words text-zinc-300 font-mono text-[11px] overflow-x-auto p-3 rounded-lg bg-black/50 border border-zinc-800 leading-relaxed">
                {JSON.stringify(editedForm, null, 2)}
              </pre>
            </div>

            <button
              onClick={onClose}
              className="mt-2 px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-emerald-600/20"
            >
              Close & Return to Dashboard
            </button>
          </div>
        ) : (
          /* Review State */
          <>
            {/* Tab bar */}
            <div className="flex items-center border-b border-zinc-800/70 px-5 pt-2 bg-zinc-900/20 gap-0.5">
              {(["edit", "json"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all duration-200 ${
                    activeTab === tab
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-300"
                  }`}
                >
                  {tab === "edit" ? <Edit3 className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                  {tab === "edit" ? "Inline Editor" : "Pydantic JSON"}
                </button>
              ))}
            </div>

            <p className="px-5 pt-3 text-xs text-zinc-400">Complete all three fields to approve your application.</p>
            {/* Body */}
            <div className="min-h-0 flex-1 px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain">
              {activeTab === "edit" ? (
                <div className="space-y-5 text-left">
                  {/* Field 1 */}
                  <div className="space-y-2">
                    <label htmlFor="review-project_name" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                      1. Project Name & Summary
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      id="review-project_name"
                      value={editedForm.project_name || ""}
                      onChange={(e) =>
                        setEditedForm({ ...editedForm, project_name: e.target.value.slice(0, 200) })
                      }
                      placeholder="e.g. Real-Time Distributed Task Queue"
                      className={inputClasses}
                    />
                  </div>

                  {/* Field 2 */}
                  <div className="space-y-2">
                    <label htmlFor="review-personal_ownership" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                      2. Personal Ownership
                    </label>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      id="review-personal_ownership"
                      value={editedForm.personal_ownership || ""}
                      onChange={(e) =>
                        setEditedForm({
                          ...editedForm,
                          personal_ownership: e.target.value.slice(0, 2000),
                        })
                      }
                      placeholder="What parts did YOU personally design or code? (e.g. I architected the ring-buffer…)"
                      className={inputClasses}
                    />
                    <p className="text-[10px] text-zinc-400">
                      Tip: Ensure individual ownership is explicit — avoid collective &quot;we&quot;.
                    </p>
                  </div>

                  {/* Field 3 */}
                  <div className="space-y-2">
                    <label htmlFor="review-impact_metrics" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                      3. Impact Metrics
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      id="review-impact_metrics"
                      value={editedForm.impact_metrics || ""}
                      onChange={(e) =>
                        setEditedForm({
                          ...editedForm,
                          impact_metrics: e.target.value.slice(0, 1000),
                        })
                      }
                      placeholder="e.g. Reduced p99 latency by 45% (down to 12ms), served 100k DAU."
                      className={`${inputClasses} font-mono`}
                    />
                    <p className="text-[10px] text-zinc-400">
                      Tip: Must include concrete numbers, percentages, or throughput metrics.
                    </p>
                  </div>
                </div>
              ) : (
                /* JSON viewer */
                <div className="relative">
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all duration-200 ${
                        isCopied
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700/60 hover:text-zinc-200 hover:bg-zinc-700"
                      }`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {isCopied ? "Copied!" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="p-4 pt-12 rounded-xl bg-zinc-950/80 border border-zinc-800/60 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed min-h-[180px]">
                    {JSON.stringify(editedForm, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* ── Modal Footer ── */}
            <div className="shrink-0 px-5 py-4 border-t border-zinc-800/70 bg-zinc-900/30 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-300 text-xs font-medium transition-all duration-150 hover:bg-zinc-800/60"
              >
                Cancel & Keep Interviewing
              </button>

              <button
                type="button"
                disabled={isSubmitted || !editedForm.project_name?.trim() || !editedForm.personal_ownership?.trim() || !editedForm.impact_metrics?.trim()}
                onClick={handleApproveAndSubmit}
                className="flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:from-indigo-600 disabled:hover:to-violet-600"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                Approve & Submit Application
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
