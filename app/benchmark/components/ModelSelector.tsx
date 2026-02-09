"use client";

import { useEffect, useRef, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";

/* ------------------ ModelSelector ------------------ */

interface ModelSelectorProps {
    selectedModel: string;
    setSelectedModel: (v: string) => void;
    loadModel: () => void;
    unloadModel: () => void;
    modelLoaded: boolean;
    status: string;
}

export function ModelSelector({
    selectedModel,
    setSelectedModel,
    loadModel,
    unloadModel,
    modelLoaded,
    status,
}: ModelSelectorProps) {
    const models = [
        { id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", name: "TinyLlama 1.1B (Light)" },
        { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 1B (Fastest)" },
        { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi-3 Mini (Balanced)" },
        { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 1.5B" },
    ];

    return (
        <div className="bg-white/10 p-4 rounded space-y-3">
            <select
                className="w-full bg-black/30 p-3 rounded"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={modelLoaded}
            >
                {models.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name}
                    </option>
                ))}
            </select>

            {!modelLoaded ? (
                <button
                    onClick={loadModel}
                    className="w-full bg-purple-600 py-3 rounded"
                >
                    Load Model
                </button>
            ) : (
                <button
                    onClick={unloadModel}
                    className="w-full bg-red-600 py-3 rounded"
                >
                    Unload Model
                </button>
            )}

            {status && (
                <p className="text-xs font-mono opacity-80">{status}</p>
            )}
        </div>
    );
}