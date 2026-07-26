'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useInferisML } from '../../benchmark/hooks/useInferisML';
import { useONNXWeb }   from '../../benchmark/hooks/useONNXWeb';

const BRAND_GREEN   = '#4fbf8a';
const BUTTON_GREEN  = '#3fa77a';
const BUTTON_HOVER  = '#357a5a';
const HORNET_AMBER  = '#f5a623';
const HORNET_DARK   = '#c47d0a';
const INFERIS_BLUE  = '#5b8ef5';
const INFERIS_DARK  = '#3a6ad4';

type ModelChoice = 'hornet' | 'inferis';

interface Message {
    id:         string;
    role:       'user' | 'assistant';
    content:    string;
    timestamp:  Date;
    streaming?: boolean;
}

/** Detect mobile/tablet */
function isMobileDevice() {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function ChatInterface() {
    const [messages,      setMessages]      = useState<Message[]>([]);
    const [input,         setInput]         = useState('');
    const [choice,        setChoice]        = useState<ModelChoice>('inferis');
    const [isMobile,      setIsMobile]      = useState(false);
    const [isGenerating,  setIsGenerating]  = useState(false);
    const [showPicker,    setShowPicker]    = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef    = useRef<HTMLTextAreaElement>(null);
    const abortRef       = useRef(false);

    // Two hooks — Hornet (ONNX) and inferis-ml
    const onnxWeb   = useONNXWeb();
    const inferisML = useInferisML();

    const active = choice === 'hornet' ? onnxWeb : inferisML;
    const { modelLoaded, status, unloadModel, generateStream } = active;

    const activeColor     = choice === 'hornet' ? HORNET_AMBER  : INFERIS_BLUE;
    const activeColorDark = choice === 'hornet' ? HORNET_DARK   : INFERIS_DARK;

    // Detect device + set default choice
    useEffect(() => {
        const mobile = isMobileDevice();
        setIsMobile(mobile);
        setChoice(mobile ? 'hornet' : 'inferis');
    }, []);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }, [input]);

    // Close picker on outside click
    useEffect(() => {
        if (!showPicker) return;
        const handler = () => setShowPicker(false);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [showPicker]);

    const handleLoad = () => {
        if (choice === 'hornet') {
            onnxWeb.loadModel('Kingman9407/hornet');
        } else {
            inferisML.loadModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
        }
    };

    const handleChoiceChange = (next: ModelChoice) => {
        if (modelLoaded) return; // prevent switching while loaded
        setChoice(next);
        setShowPicker(false);
    };

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || !modelLoaded || isGenerating) return;

        const userMsg: Message = {
            id:        crypto.randomUUID(),
            role:      'user',
            content:   text,
            timestamp: new Date(),
        };
        const assistantMsg: Message = {
            id:        crypto.randomUUID(),
            role:      'assistant',
            content:   '',
            timestamp: new Date(),
            streaming: true,
        };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setInput('');
        setIsGenerating(true);
        abortRef.current = false;

        try {
            let accumulated = '';
            const stream = generateStream(text, { temperature: 0.7 });

            for await (const chunk of stream) {
                if (abortRef.current) break;
                // __REPLACE__: sentinel means the worker's parseJsonResponse has
                // produced the final clean text — swap out the raw streamed fragments.
                if (chunk.startsWith('__REPLACE__:')) {
                    accumulated = chunk.slice('__REPLACE__:'.length);
                } else {
                    accumulated += chunk;
                }
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                    )
                );
            }

            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMsg.id ? { ...m, streaming: false } : m
                )
            );
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Generation failed';
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMsg.id
                        ? { ...m, content: `❌ ${errMsg}`, streaming: false }
                        : m
                )
            );
        } finally {
            setIsGenerating(false);
        }
    }, [input, modelLoaded, isGenerating, generateStream]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([]);
        abortRef.current = true;
    };

    // ── Model display labels ──────────────────────────────────────────────────
    const modelLabel = choice === 'hornet'
        ? { name: 'SmolLM2 135M', sub: 'ONNX · WASM', color: HORNET_AMBER }
        : { name: 'inferis-ml',   sub: 'Qwen 2.5 0.5B · WebGPU', color: INFERIS_BLUE };

    return (
        <div
            style={{
                display:         'flex',
                flexDirection:   'column',
                height:          '100dvh',
                backgroundColor: '#0a0b0d',
                color:           '#f2f3f5',
                fontFamily:      'var(--font-geist-sans, system-ui, sans-serif)',
            }}
        >
            {/* ══════════════ HEADER ══════════════ */}
            <header
                style={{
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    padding:         '72px 20px 12px',
                    borderBottom:    '1px solid #1e2024',
                    backgroundColor: '#0a0b0d',
                    position:        'sticky',
                    top:             0,
                    zIndex:          20,
                    flexWrap:        'wrap',
                    gap:             '10px',
                }}
            >
                {/* Left: title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1
                        style={{
                            fontSize:   '1.3rem',
                            fontWeight: 700,
                            margin:     0,
                            color:      '#f2f3f5',
                            textShadow: `0 0 18px ${BRAND_GREEN}50`,
                        }}
                    >
                        Local AI Chat
                    </h1>
                    <span
                        style={{
                            fontSize:        '0.65rem',
                            padding:         '2px 8px',
                            borderRadius:    '999px',
                            backgroundColor: `${BRAND_GREEN}18`,
                            border:          `1px solid ${BRAND_GREEN}44`,
                            color:           BRAND_GREEN,
                            fontWeight:      600,
                        }}
                    >
                        Runs In-Browser
                    </span>
                </div>

                {/* Right: model picker + load/unload + clear */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                    {/* ── Model Picker button ── */}
                    <div style={{ position: 'relative' }}>
                        <button
                            id="model-picker-btn"
                            disabled={modelLoaded}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPicker(v => !v);
                            }}
                            style={{
                                display:         'flex',
                                alignItems:      'center',
                                gap:             '7px',
                                padding:         '6px 12px',
                                borderRadius:    '10px',
                                border:          `1px solid ${activeColor}55`,
                                backgroundColor: '#18191c',
                                color:           '#f2f3f5',
                                fontSize:        '0.8rem',
                                fontWeight:      600,
                                cursor:          modelLoaded ? 'not-allowed' : 'pointer',
                                opacity:         modelLoaded ? 0.6 : 1,
                                transition:      'border-color 0.2s',
                            }}
                        >
                            <span style={{
                                    width:           '8px',
                                    height:          '8px',
                                    borderRadius:    '50%',
                                    backgroundColor: activeColor,
                                    display:         'inline-block',
                                    flexShrink:      0,
                                }} />
                            <span>{modelLabel.name}</span>
                            <span style={{ color: activeColor, fontSize: '0.65rem' }}>▾</span>
                        </button>

                        {/* ── Dropdown ── */}
                        {showPicker && !modelLoaded && (
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    position:        'absolute',
                                    right:           0,
                                    top:             'calc(100% + 6px)',
                                    backgroundColor: '#18191c',
                                    border:          '1px solid #2a2c31',
                                    borderRadius:    '12px',
                                    overflow:        'hidden',
                                    zIndex:          50,
                                    minWidth:        '230px',
                                    boxShadow:       '0 8px 28px rgba(0,0,0,0.55)',
                                }}
                            >
                                {/* inferis-ml option */}
                                <button
                                    id="picker-inferis"
                                    onClick={() => handleChoiceChange('inferis')}
                                    style={{
                                        width:           '100%',
                                        padding:         '12px 14px',
                                        textAlign:       'left',
                                        backgroundColor: choice === 'inferis' ? `${INFERIS_BLUE}15` : 'transparent',
                                        border:          'none',
                                        borderBottom:    '1px solid #2a2c31',
                                        color:           choice === 'inferis' ? INFERIS_BLUE : '#b0b4bb',
                                        cursor:          'pointer',
                                        transition:      'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${INFERIS_BLUE}10`)}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = choice === 'inferis' ? `${INFERIS_BLUE}15` : 'transparent')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                        <span style={{
                                            width:           '8px',
                                            height:          '8px',
                                            borderRadius:    '50%',
                                            backgroundColor: INFERIS_BLUE,
                                            display:         'inline-block',
                                            flexShrink:      0,
                                        }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>inferis-ml</span>
                                        <span style={{
                                            marginLeft:      'auto',
                                            fontSize:        '0.6rem',
                                            fontWeight:      700,
                                            padding:         '1px 6px',
                                            borderRadius:    '99px',
                                            backgroundColor: `${BRAND_GREEN}22`,
                                            color:           BRAND_GREEN,
                                        }}>
                                            All Devices
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#6e7278', paddingLeft: '16px' }}>
                                        Qwen 2.5 0.5B · WebGPU + WASM fallback
                                    </div>
                                </button>

                                {/* Hornet option — shown for everyone */}
                                <button
                                    id="picker-hornet"
                                    onClick={() => handleChoiceChange('hornet')}
                                    style={{
                                        width:           '100%',
                                        padding:         '12px 14px',
                                        textAlign:       'left',
                                        backgroundColor: choice === 'hornet' ? `${HORNET_AMBER}15` : 'transparent',
                                        border:          'none',
                                        color:           choice === 'hornet' ? HORNET_AMBER : '#b0b4bb',
                                        cursor:          'pointer',
                                        transition:      'background 0.15s',
                                        opacity:         1,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${HORNET_AMBER}10`; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = choice === 'hornet' ? `${HORNET_AMBER}15` : 'transparent'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                        <span style={{
                                            width:           '8px',
                                            height:          '8px',
                                            borderRadius:    '50%',
                                            backgroundColor: HORNET_AMBER,
                                            display:         'inline-block',
                                            flexShrink:      0,
                                        }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>SmolLM2 135M</span>
                                        <span style={{
                                            marginLeft:      'auto',
                                            fontSize:        '0.6rem',
                                            fontWeight:      700,
                                            padding:         '1px 6px',
                                            borderRadius:    '99px',
                                            backgroundColor: `${HORNET_AMBER}22`,
                                            color:           HORNET_AMBER,
                                        }}>
                                            All Devices
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#6e7278', paddingLeft: '16px' }}>
                                        SmolLM2 135M · ONNX WASM
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Load / Unload ── */}
                    {!modelLoaded ? (
                        <button
                            id="load-model-btn"
                            onClick={handleLoad}
                            style={{
                                padding:         '6px 14px',
                                borderRadius:    '8px',
                                border:          'none',
                                backgroundColor: activeColor,
                                color:           '#fff',
                                fontSize:        '0.8rem',
                                fontWeight:      600,
                                cursor:          'pointer',
                                transition:      'background 0.2s',
                                whiteSpace:      'nowrap',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = activeColorDark)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = activeColor)}
                        >
                            Load
                        </button>
                    ) : (
                        <button
                            id="unload-model-btn"
                            onClick={unloadModel}
                            style={{
                                padding:         '6px 14px',
                                borderRadius:    '8px',
                                border:          'none',
                                backgroundColor: '#5f2a2a',
                                color:           '#f2f3f5',
                                fontSize:        '0.8rem',
                                fontWeight:      600,
                                cursor:          'pointer',
                                transition:      'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#7a3535')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#5f2a2a')}
                        >
                            Unload
                        </button>
                    )}

                    {/* ── Clear ── */}
                    {messages.length > 0 && (
                        <button
                            id="clear-chat-btn"
                            onClick={clearChat}
                            title="Clear chat"
                            style={{
                                padding:         '6px 10px',
                                borderRadius:    '8px',
                                backgroundColor: '#18191c',
                                border:          '1px solid #34363c',
                                color:           '#b0b4bb',
                                fontSize:        '0.8rem',
                                cursor:          'pointer',
                                transition:      'border-color 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#555';
                                e.currentTarget.style.color = '#f2f3f5';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#34363c';
                                e.currentTarget.style.color = '#b0b4bb';
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* ══════════════ STATUS BAR ══════════════ */}
            {status && (
                <div
                    style={{
                        padding:       '5px 20px',
                        backgroundColor: '#111214',
                        borderBottom:  '1px solid #1e2024',
                        fontSize:      '0.7rem',
                        color:         status.startsWith('❌') ? '#ef4444' : status.startsWith('✅') ? BRAND_GREEN : '#9ca0a8',
                        fontFamily:    'var(--font-geist-mono, monospace)',
                        letterSpacing: '0.02em',
                        transition:    'color 0.2s',
                    }}
                >
                    {status}
                </div>
            )}

            {/* ══════════════ MESSAGES ══════════════ */}
            <main
                style={{
                    flex:          1,
                    overflowY:     'auto',
                    padding:       '24px 16px',
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           '16px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#34363c transparent',
                }}
            >
                {messages.length === 0 && (
                    <div
                        style={{
                            flex:           1,
                            display:        'flex',
                            flexDirection:  'column',
                            alignItems:     'center',
                            justifyContent: 'center',
                            gap:            '14px',
                            opacity:        0.6,
                            paddingBottom:  '80px',
                        }}
                    >
                        <div
                            style={{
                                width:          '60px',
                                height:         '60px',
                                borderRadius:   '50%',
                                background:     `radial-gradient(circle, ${BRAND_GREEN}30 0%, transparent 70%)`,
                                border:         `2px solid ${BRAND_GREEN}40`,
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                fontSize:       '1.8rem',
                            }}
                        >
                            💬
                        </div>
                        <p style={{ color: '#b0b4bb', fontSize: '0.9rem', textAlign: 'center', maxWidth: '260px', margin: 0 }}>
                            {modelLoaded ? 'Start typing to chat with the AI' : 'Load a model above to start chatting'}
                        </p>
                        {!modelLoaded && (
                            <p style={{ color: '#555', fontSize: '0.72rem', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
                                All inference runs locally in your browser — no data is sent to any server.
                            </p>
                        )}
                    </div>
                )}

                {messages.map(msg => (
                    <div
                        key={msg.id}
                        style={{
                            display:    'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-end',
                            gap:        '8px',
                        }}
                    >
                        {/* Bot avatar */}
                        {msg.role === 'assistant' && (
                            <div
                                style={{
                                    width:          '28px',
                                    height:         '28px',
                                    borderRadius:   '50%',
                                    background:     `linear-gradient(135deg, ${BRAND_GREEN}40, ${BRAND_GREEN}20)`,
                                    border:         `1px solid ${BRAND_GREEN}55`,
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: 'center',
                                    fontSize:       '0.85rem',
                                    flexShrink:     0,
                                }}
                            >
                            <div style={{
                                    width:           '10px',
                                    height:          '10px',
                                    borderRadius:    '50%',
                                    backgroundColor: activeColor,
                                    boxShadow:       `0 0 6px ${activeColor}88`,
                                }} />
                            </div>
                        )}

                        {/* Bubble */}
                        <div
                            style={{
                                maxWidth:        '75%',
                                padding:         '10px 14px',
                                borderRadius:    msg.role === 'user'
                                    ? '18px 18px 4px 18px'
                                    : '18px 18px 18px 4px',
                                backgroundColor: msg.role === 'user'
                                    ? `${BRAND_GREEN}22`
                                    : '#18191c',
                                border:          `1px solid ${msg.role === 'user' ? BRAND_GREEN + '40' : '#2a2c31'}`,
                                fontSize:        '0.9rem',
                                lineHeight:      '1.6',
                                color:           '#f2f3f5',
                                whiteSpace:      'pre-wrap',
                                wordBreak:       'break-word',
                                position:        'relative',
                            }}
                        >
                            {msg.content || (msg.streaming && (
                                <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <span
                                            key={i}
                                            style={{
                                                width:           '6px',
                                                height:          '6px',
                                                borderRadius:    '50%',
                                                backgroundColor: BRAND_GREEN,
                                                display:         'inline-block',
                                                animation:       `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                                            }}
                                        />
                                    ))}
                                </span>
                            ))}
                            {msg.streaming && msg.content && (
                                <span
                                    style={{
                                        display:         'inline-block',
                                        width:           '2px',
                                        height:          '1em',
                                        backgroundColor: BRAND_GREEN,
                                        marginLeft:      '2px',
                                        verticalAlign:   'text-bottom',
                                        animation:       'blink 0.8s step-end infinite',
                                    }}
                                />
                            )}
                        </div>

                        {/* User avatar */}
                        {msg.role === 'user' && (
                            <div
                                style={{
                                    width:          '28px',
                                    height:         '28px',
                                    borderRadius:   '50%',
                                    background:     'linear-gradient(135deg, #3d5a80, #2c3e50)',
                                    border:         '1px solid #3d5a8088',
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: 'center',
                                    fontSize:       '0.85rem',
                                    flexShrink:     0,
                                }}
                            >
                                👤
                            </div>
                        )}
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </main>

            {/* ══════════════ INPUT ══════════════ */}
            <footer
                style={{
                    padding:         '12px 16px 20px',
                    borderTop:       '1px solid #1e2024',
                    backgroundColor: '#0a0b0d',
                }}
            >
                <div
                    style={{
                        maxWidth:        '900px',
                        margin:          '0 auto',
                        display:         'flex',
                        gap:             '8px',
                        alignItems:      'flex-end',
                        backgroundColor: '#18191c',
                        border:          `1px solid ${modelLoaded ? activeColor + '44' : '#34363c'}`,
                        borderRadius:    '14px',
                        padding:         '8px 8px 8px 14px',
                        transition:      'border-color 0.2s',
                    }}
                >
                    <textarea
                        ref={textareaRef}
                        id="chat-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            !modelLoaded
                                ? 'Load a model to start chatting…'
                                : isGenerating
                                    ? 'Generating…'
                                    : 'Message the AI… (Enter to send, Shift+Enter for newline)'
                        }
                        disabled={!modelLoaded || isGenerating}
                        rows={1}
                        style={{
                            flex:       1,
                            background: 'transparent',
                            border:     'none',
                            outline:    'none',
                            color:      '#f2f3f5',
                            fontSize:   '0.9rem',
                            resize:     'none',
                            lineHeight: '1.5',
                            maxHeight:  '160px',
                            overflow:   'auto',
                            fontFamily: 'inherit',
                        }}
                    />
                    <button
                        id="send-message-btn"
                        onClick={sendMessage}
                        disabled={!modelLoaded || isGenerating || !input.trim()}
                        style={{
                            width:           '36px',
                            height:          '36px',
                            borderRadius:    '8px',
                            flexShrink:      0,
                            backgroundColor: modelLoaded && input.trim() && !isGenerating ? BUTTON_GREEN : '#232428',
                            border:          'none',
                            color:           modelLoaded && input.trim() && !isGenerating ? '#fff' : '#555',
                            display:         'flex',
                            alignItems:      'center',
                            justifyContent:  'center',
                            cursor:          modelLoaded && input.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                            fontSize:        '1rem',
                            transition:      'background 0.2s, color 0.2s',
                        }}
                        onMouseEnter={e => {
                            if (modelLoaded && input.trim() && !isGenerating)
                                e.currentTarget.style.backgroundColor = BUTTON_HOVER;
                        }}
                        onMouseLeave={e => {
                            if (modelLoaded && input.trim() && !isGenerating)
                                e.currentTarget.style.backgroundColor = BUTTON_GREEN;
                        }}
                    >
                        ↑
                    </button>
                </div>
                <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#555', marginTop: '8px' }}>
                    AI runs on your device · No data sent to servers
                </p>
            </footer>

            {/* ══════════════ KEYFRAMES ══════════════ */}
            <style>{`
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
