'use client';

import { useState } from 'react';

interface ModelSelectorProps {
    selectedModel: string;
    setSelectedModel: (v: string) => void;
    loadModel: () => void;
    unloadModel: () => void;
    modelLoaded: boolean;
    status: string;
}

const BRAND_GREEN = '#4fbf8a';
const BUTTON_GREEN = '#3fa77a';
const BUTTON_HOVER = '#357a5a';

export function ModelSelector({
    selectedModel,
    setSelectedModel,
    loadModel,
    unloadModel,
    modelLoaded,
    status,
}: ModelSelectorProps) {
    const models = [
        { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 0.5B (Lightest)' },
        { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama 1.1B (Light)' },
        { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B (Fastest)' },
    ];

    return (
        <div
            className="p-4 rounded-lg space-y-3"
            style={{
                backgroundColor: '#18191c',
            }}
        >
            {/* Model dropdown */}
            <select
                className="
          w-full p-3 rounded
          bg-[#232428]
          border border-[#34363c]
          text-[#f2f3f5]
          focus:outline-none
        "
                style={{
                    borderColor: modelLoaded ? '#34363c' : `${BRAND_GREEN}55`,
                }}
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

            {/* Load / Unload button */}
            {!modelLoaded ? (
                <button
                    onClick={loadModel}
                    className="w-full py-3 rounded-md text-white font-medium transition"
                    style={{ backgroundColor: BUTTON_GREEN }}
                    onMouseEnter={e =>
                        (e.currentTarget.style.backgroundColor = BUTTON_HOVER)
                    }
                    onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor = BUTTON_GREEN)
                    }
                >
                    Load Model
                </button>
            ) : (
                <button
                    onClick={unloadModel}
                    className="w-full py-3 rounded-md font-medium transition"
                    style={{
                        backgroundColor: '#7a3535',
                        color: '#f2f3f5',
                    }}
                    onMouseEnter={e =>
                        (e.currentTarget.style.backgroundColor = '#5f2a2a')
                    }
                    onMouseLeave={e =>
                        (e.currentTarget.style.backgroundColor = '#7a3535')
                    }
                >
                    Unload Model
                </button>
            )}

            {/* Status */}
            {status && (
                <p className="text-xs font-mono text-[#9ca0a8]">
                    {status}
                </p>
            )}
        </div>
    );
}
