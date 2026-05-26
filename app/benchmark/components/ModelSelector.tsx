'use client';

const BRAND_GREEN  = '#4fbf8a';
const BUTTON_GREEN = '#3fa77a';
const BUTTON_HOVER = '#357a5a';
const INFERIS_BLUE = '#5b8ef5';
const INFERIS_DARK = '#3a6ad4';
const ONNX_PURPLE  = '#a855f7';
const ONNX_DARK    = '#7e22ce';

interface ModelSelectorProps {
    selectedModel:    string;
    setSelectedModel: (v: string) => void;
    loadModel:        () => void;
    unloadModel:      () => void;
    modelLoaded:      boolean;
    status:           string;
    backend:          'webllm' | 'inferis' | 'onnx';
    onChangeBackend:  (v: 'webllm' | 'inferis' | 'onnx') => void;
}

const MLC_MODELS = [
    { id: 'SmolLM2-135M-Instruct-q0f16-MLC',      name: 'SmolLM2 135M (Ultra Light)' },
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',    name: 'Qwen 2.5 0.5B (Lightest)' },
    { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',  name: 'TinyLlama 1.1B (Light)'   },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',     name: 'Llama 3.2 1B (Fastest)'   },
];

const ONNX_MODELS = [
    { id: 'onnx-community/SmolLM2-135M-Instruct', name: 'SmolLM2 135M (ONNX Web)' }
];

const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;

export function ModelSelector({
    selectedModel,
    setSelectedModel,
    loadModel,
    unloadModel,
    modelLoaded,
    status,
    backend,
    onChangeBackend,
}: ModelSelectorProps) {
    const isONNX = backend === 'onnx';
    const isInferis = backend === 'inferis';
    const isWebLLM = backend === 'webllm';

    const activeColor = isONNX ? ONNX_PURPLE : isInferis ? INFERIS_BLUE : BRAND_GREEN;
    const activeColorDark = isONNX ? ONNX_DARK : isInferis ? INFERIS_DARK : BUTTON_HOVER;
    const activeBgColor = isONNX ? ONNX_PURPLE : isInferis ? INFERIS_BLUE : BUTTON_GREEN;

    const currentModels = isONNX ? ONNX_MODELS : MLC_MODELS;

    const getBackendDescription = () => {
        if (!hasWebGPU) {
            return '⚠️ WebGPU unsupported — Locked to WASM CPU Fallback mode';
        }
        if (isWebLLM) {
            return 'Direct @mlc-ai/web-llm engine — running locally in main thread';
        }
        if (isInferis) {
            return 'inferis-ml Worker Pool — background thread execution & tab-de-duplication';
        }
        return 'ONNX Runtime Web (Transformers.js) — highly optimized ONNX inference';
    };

    return (
        <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: '#18191c' }}>
            
            {/* ─── Premium Segmented Backend Selector ─── */}
            <div className="space-y-2">
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8e9297', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    SELECT EXECUTION BACKEND
                </label>
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '6px', 
                        padding: '4px',
                        backgroundColor: '#111214',
                        borderRadius: '10px',
                        border: '1px solid #2a2c31'
                    }}
                >
                    {[
                        { key: 'webllm', label: 'Direct WebLLM', color: BRAND_GREEN },
                        { key: 'inferis', label: 'inferis-ml', color: INFERIS_BLUE },
                        { key: 'onnx', label: 'ONNX Runtime', color: ONNX_PURPLE }
                    ].map((btn) => {
                        const active = backend === btn.key;
                        return (
                            <button
                                key={btn.key}
                                disabled={modelLoaded}
                                onClick={() => {
                                    onChangeBackend(btn.key as any);
                                    // Auto-select standard model for backend
                                    if (btn.key === 'onnx') {
                                        setSelectedModel('onnx-community/SmolLM2-135M-Instruct');
                                    } else {
                                        setSelectedModel('SmolLM2-135M-Instruct-q0f16-MLC');
                                    }
                                }}
                                style={{
                                    padding: '8px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    borderRadius: '7px',
                                    border: 'none',
                                    backgroundColor: active ? btn.color : 'transparent',
                                    color: active ? '#fff' : '#b0b4bb',
                                    cursor: modelLoaded ? 'not-allowed' : 'pointer',
                                    opacity: modelLoaded && !active ? 0.3 : 1,
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: active ? `0 2px 8px ${btn.color}40` : 'none',
                                    textAlign: 'center'
                                }}
                            >
                                {btn.label}
                            </button>
                        );
                    })}
                </div>
                <div style={{ fontSize: '0.68rem', color: activeColor, minHeight: '16px', transition: 'color 0.2s', marginTop: '4px' }}>
                    {getBackendDescription()}
                </div>
            </div>

            {/* ─── Model Dropdown ─── */}
            <div className="space-y-1.5">
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8e9297', letterSpacing: '0.05em' }}>
                    CHOOSE AI MODEL
                </label>
                <select
                    className="w-full p-3 rounded bg-[#232428] border text-[#f2f3f5] focus:outline-none transition"
                    style={{ borderColor: modelLoaded ? '#34363c' : `${activeColor}55` }}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={modelLoaded}
                >
                    {currentModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            {/* ─── Load / Unload Buttons ─── */}
            {!modelLoaded ? (
                <button
                    id="load-model-selector-btn"
                    onClick={loadModel}
                    className="w-full py-3 rounded-md text-white font-semibold transition"
                    style={{ 
                        backgroundColor: activeBgColor,
                        boxShadow: `0 4px 14px ${activeColor}22`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = activeColorDark)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = activeBgColor)}
                >
                    {isONNX ? '🔮 Load via ONNX Web' : isInferis ? '⚡ Load via inferis-ml' : '🚀 Load via Direct WebLLM'}
                </button>
            ) : (
                <button
                    id="unload-model-selector-btn"
                    onClick={unloadModel}
                    className="w-full py-3 rounded-md font-semibold transition"
                    style={{ backgroundColor: '#7a3535', color: '#f2f3f5' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5f2a2a')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7a3535')}
                >
                    Unload Model
                </button>
            )}

            {/* ─── Running Status Feedback ─── */}
            {status && (
                <p 
                    className="text-xs font-mono p-2.5 rounded bg-[#111214] border border-[#2a2c31] leading-relaxed transition-all"
                    style={{ color: status.startsWith('❌') ? '#ef4444' : status.startsWith('✅') ? BRAND_GREEN : '#9ca0a8' }}
                >
                    {status}
                </p>
            )}
        </div>
    );
}
