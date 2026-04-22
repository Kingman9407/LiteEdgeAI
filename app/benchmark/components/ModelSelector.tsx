'use client';

const BRAND_GREEN  = '#4fbf8a';
const BUTTON_GREEN = '#3fa77a';
const BUTTON_HOVER = '#357a5a';
const INFERIS_BLUE = '#5b8ef5';
const INFERIS_DARK = '#3a6ad4';

interface ModelSelectorProps {
    selectedModel:    string;
    setSelectedModel: (v: string) => void;
    loadModel:        () => void;
    unloadModel:      () => void;
    modelLoaded:      boolean;
    status:           string;
    /** Whether the inferis-ml worker pool backend is enabled */
    useInferis:       boolean;
    /** Toggle the inferis-ml backend on / off */
    onToggleInferis:  () => void;
}

const MODELS = [
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',    name: 'Qwen 2.5 0.5B (Lightest)' },
    { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',  name: 'TinyLlama 1.1B (Light)'   },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',     name: 'Llama 3.2 1B (Fastest)'   },
];

export function ModelSelector({
    selectedModel,
    setSelectedModel,
    loadModel,
    unloadModel,
    modelLoaded,
    status,
    useInferis,
    onToggleInferis,
}: ModelSelectorProps) {
    return (
        <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#18191c' }}>

            {/* ── inferis-ml toggle ── */}
            <div
                style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '10px 14px',
                    borderRadius:   '10px',
                    border:         `1px solid ${useInferis ? INFERIS_BLUE + '55' : '#2a2c31'}`,
                    backgroundColor: useInferis ? `${INFERIS_BLUE}12` : '#111214',
                    transition:     'all 0.25s',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: useInferis ? INFERIS_BLUE : '#b0b4bb' }}>
                        ⚡ inferis-ml Worker Pool
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#555' }}>
                        {useInferis
                            ? 'Enabled — cross-tab dedup, streaming, auto WebGPU/WASM'
                            : 'Off — using direct @mlc-ai/web-llm engine'}
                    </span>
                </div>

                {/* pill toggle */}
                <button
                    id="inferis-toggle-btn"
                    onClick={() => { if (!modelLoaded) onToggleInferis(); }}
                    title={modelLoaded ? 'Unload model before toggling' : (useInferis ? 'Disable inferis-ml' : 'Enable inferis-ml')}
                    style={{
                        position:        'relative',
                        width:           '46px',
                        height:          '26px',
                        borderRadius:    '999px',
                        border:          'none',
                        backgroundColor: useInferis ? INFERIS_BLUE : '#34363c',
                        cursor:          modelLoaded ? 'not-allowed' : 'pointer',
                        opacity:         modelLoaded ? 0.5 : 1,
                        transition:      'background 0.22s',
                        flexShrink:      0,
                        padding:         0,
                    }}
                >
                    <span
                        style={{
                            position:        'absolute',
                            top:             '3px',
                            left:            useInferis ? '22px' : '3px',
                            width:           '20px',
                            height:          '20px',
                            borderRadius:    '50%',
                            backgroundColor: '#fff',
                            boxShadow:       '0 1px 4px rgba(0,0,0,0.4)',
                            transition:      'left 0.22s',
                        }}
                    />
                </button>
            </div>

            {/* ── model dropdown ── */}
            <select
                className="w-full p-3 rounded bg-[#232428] border border-[#34363c] text-[#f2f3f5] focus:outline-none"
                style={{ borderColor: modelLoaded ? '#34363c' : `${BRAND_GREEN}55` }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={modelLoaded}
            >
                {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>

            {/* ── Load / Unload ── */}
            {!modelLoaded ? (
                <button
                    id="load-model-selector-btn"
                    onClick={loadModel}
                    className="w-full py-3 rounded-md text-white font-medium transition"
                    style={{ backgroundColor: useInferis ? INFERIS_BLUE : BUTTON_GREEN }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = useInferis ? INFERIS_DARK : BUTTON_HOVER)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = useInferis ? INFERIS_BLUE : BUTTON_GREEN)}
                >
                    {useInferis ? '⚡ Load via inferis-ml' : 'Load Model'}
                </button>
            ) : (
                <button
                    id="unload-model-selector-btn"
                    onClick={unloadModel}
                    className="w-full py-3 rounded-md font-medium transition"
                    style={{ backgroundColor: '#7a3535', color: '#f2f3f5' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5f2a2a')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7a3535')}
                >
                    Unload Model
                </button>
            )}

            {/* ── Status ── */}
            {status && (
                <p className="text-xs font-mono text-[#9ca0a8]">{status}</p>
            )}
        </div>
    );
}

