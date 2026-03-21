"use client";

/**
 * ProcessingOverlay.tsx
 * Full-viewport overlay that tracks all 5 processing stages.
 *
 * Shows: stage name, progress bar, filename, 5-step indicator,
 * per-stage live summary, and a spinner for clustering.
 */

import { type ProcessingStage } from "./photos";

// ─── Stage metadata ──────────────────────────────────────────────────────────

const STAGE_META = [
    { key: "saving",     num: "①", label: "Saving",          icon: "💾" },
    { key: "blur",       num: "②", label: "Blur",            icon: "🔍" },
    { key: "faces",      num: "③", label: "Face detection",  icon: "👤" },
    { key: "eyes",       num: "④", label: "Eyes check",      icon: "👁️" },
    { key: "clustering", num: "⑤", label: "Clustering",      icon: "🧩" },
] as const;

type StageKey = (typeof STAGE_META)[number]["key"];

function stageIndex(step: string): number {
    return STAGE_META.findIndex((s) => s.key === step);
}

// ─── Stage title map ─────────────────────────────────────────────────────────

const STAGE_TITLES: Record<string, string> = {
    saving: "Saving files",
    blur: "Checking blur",
    faces: "Detecting faces",
    eyes: "Checking eyes",
    clustering: "Clustering faces",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessingOverlay({ stage }: { stage: ProcessingStage }) {
    if (stage.step === "idle") return null;

    const activeIdx = stageIndex(stage.step);
    const title = STAGE_TITLES[stage.step] ?? "";

    // Per-file progress (all stages except clustering)
    const hasProgress = stage.step !== "clustering";
    const current = hasProgress ? (stage as any).current : 0;
    const total = hasProgress ? (stage as any).total : 0;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const fileName = hasProgress ? (stage as any).fileName : "";

    // Per-stage live summary
    let summary = "";
    if (stage.step === "saving") {
        summary = `${current} of ${total} saved`;
    } else if (stage.step === "blur") {
        summary = `${(stage as any).blurryCount} blurry so far`;
    } else if (stage.step === "faces") {
        summary = `${(stage as any).faceCount} faces found · ${(stage as any).noFaceCount} no face`;
    } else if (stage.step === "eyes") {
        summary = `${(stage as any).closedCount} closed eyes`;
    } else if (stage.step === "clustering") {
        summary = (stage as any).message || "Running Chinese Whispers…";
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md">
            <div className="bg-[#16181c] border border-[#1f2227] rounded-2xl p-8 w-[420px] flex flex-col items-center gap-6 shadow-2xl">

                {/* Animated icon */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-[#3fa77a]/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#3fa77a]/40" />
                    <span className="text-3xl">
                        {STAGE_META[activeIdx]?.icon ?? "⚙️"}
                    </span>
                </div>

                {/* Stage title */}
                <h2 className="text-lg font-bold text-[#f2f3f5] tracking-tight">
                    {title}
                </h2>

                {/* 5-step indicator */}
                <div className="flex items-center gap-1 w-full justify-center flex-wrap">
                    {STAGE_META.map((s, i) => {
                        const isActive = i === activeIdx;
                        const isDone = i < activeIdx;
                        return (
                            <div key={s.key} className="flex items-center gap-1">
                                <span
                                    className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-300 whitespace-nowrap ${
                                        isActive
                                            ? "bg-[#3fa77a] text-white shadow-lg shadow-[#3fa77a]/30"
                                            : isDone
                                            ? "bg-[#3fa77a]/20 text-[#3fa77a]"
                                            : "bg-[#1f2227] text-[#555a66]"
                                    }`}
                                >
                                    {s.num} {s.label}
                                </span>
                                {i < STAGE_META.length - 1 && (
                                    <span className={`text-[10px] ${isDone ? "text-[#3fa77a]/50" : "text-[#2a2d35]"}`}>→</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Progress bar (not shown for clustering) */}
                {hasProgress && (
                    <div className="w-full">
                        <div className="flex justify-between text-[0.68rem] text-[#888c96] mb-1.5">
                            <span className="truncate max-w-[220px]" title={fileName}>
                                {fileName || "Preparing…"}
                            </span>
                            <span className="flex-shrink-0 ml-2">{current} / {total}</span>
                        </div>
                        <div className="w-full h-2 bg-[#1f2227] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#3fa77a] to-[#2dce89] rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Clustering spinner */}
                {stage.step === "clustering" && (
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#3fa77a] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-[#888c96]">{summary}</span>
                    </div>
                )}

                {/* Percentage / summary */}
                {hasProgress && (
                    <p className="text-3xl font-bold text-[#3fa77a]">{pct}%</p>
                )}

                {/* Live summary */}
                {summary && stage.step !== "clustering" && (
                    <p className="text-xs text-[#555a66] -mt-2">{summary}</p>
                )}
            </div>
        </div>
    );
}
