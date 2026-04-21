'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWebLLM } from '../../benchmark/hooks/useWebLLM';

const BRAND_GREEN = '#4fbf8a';
const BUTTON_GREEN = '#3fa77a';
const BUTTON_HOVER = '#357a5a';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    streaming?: boolean;
}

const MODELS = [
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 0.5B', tag: 'Lightest' },
    { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama 1.1B', tag: 'Light' },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', tag: 'Fast' },
];

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef(false);

    const {
        modelLoaded,
        status,
        loadModel,
        unloadModel,
        generateStream,
    } = useWebLLM();

    // Auto-scroll
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

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || !modelLoaded || isGenerating) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        const assistantMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
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
                accumulated += chunk;
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMsg.id
                            ? { ...m, content: accumulated }
                            : m
                    )
                );
            }

            // Mark streaming done
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMsg.id
                        ? { ...m, streaming: false }
                        : m
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

    const selectedModelInfo = MODELS.find(m => m.id === model);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100dvh',
                backgroundColor: '#0a0b0d',
                color: '#f2f3f5',
                fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
            }}
        >
            {/* ── Header ── */}
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '72px 20px 12px',
                    borderBottom: '1px solid #34363c',
                    backgroundColor: '#0a0b0d',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    flexWrap: 'wrap',
                    gap: '10px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1
                        style={{
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textShadow: `0 0 18px ${BRAND_GREEN}50`,
                            color: '#f2f3f5',
                            margin: 0,
                        }}
                    >
                        Local AI Chat
                    </h1>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: `${BRAND_GREEN}18`,
                            border: `1px solid ${BRAND_GREEN}55`,
                            color: BRAND_GREEN,
                            fontWeight: 600,
                        }}
                    >
                        Runs In-Browser
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Model picker */}
                    <div style={{ position: 'relative' }}>
                        <button
                            id="model-picker-btn"
                            onClick={() => setShowModelPicker(v => !v)}
                            disabled={modelLoaded}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: `1px solid ${BRAND_GREEN}55`,
                                backgroundColor: '#18191c',
                                color: '#f2f3f5',
                                fontSize: '0.8rem',
                                cursor: modelLoaded ? 'not-allowed' : 'pointer',
                                opacity: modelLoaded ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span>{selectedModelInfo?.name ?? model}</span>
                            <span style={{ color: BRAND_GREEN }}>▾</span>
                        </button>

                        {showModelPicker && !modelLoaded && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 6px)',
                                    backgroundColor: '#18191c',
                                    border: '1px solid #34363c',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    zIndex: 50,
                                    minWidth: '220px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                }}
                            >
                                {MODELS.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            setModel(m.id);
                                            setShowModelPicker(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            textAlign: 'left',
                                            backgroundColor: m.id === model ? '#232428' : 'transparent',
                                            border: 'none',
                                            color: m.id === model ? BRAND_GREEN : '#b0b4bb',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#232428')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = m.id === model ? '#232428' : 'transparent')}
                                    >
                                        <span>{m.name}</span>
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '1px 6px',
                                                borderRadius: '999px',
                                                backgroundColor: `${BRAND_GREEN}22`,
                                                color: BRAND_GREEN,
                                            }}
                                        >
                                            {m.tag}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Load / Unload */}
                    {!modelLoaded ? (
                        <button
                            id="load-model-btn"
                            onClick={() => loadModel(model)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                backgroundColor: BUTTON_GREEN,
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = BUTTON_HOVER)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = BUTTON_GREEN)}
                        >
                            Load Model
                        </button>
                    ) : (
                        <button
                            id="unload-model-btn"
                            onClick={unloadModel}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                backgroundColor: '#5f2a2a',
                                border: 'none',
                                color: '#f2f3f5',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#7a3535')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#5f2a2a')}
                        >
                            Unload
                        </button>
                    )}

                    {/* Clear */}
                    {messages.length > 0 && (
                        <button
                            id="clear-chat-btn"
                            onClick={clearChat}
                            title="Clear chat"
                            style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                backgroundColor: '#18191c',
                                border: '1px solid #34363c',
                                color: '#b0b4bb',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s, color 0.2s',
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

            {/* ── Status bar ── */}
            {status && (
                <div
                    style={{
                        padding: '6px 20px',
                        backgroundColor: '#111214',
                        borderBottom: '1px solid #1e2024',
                        fontSize: '0.72rem',
                        color: '#9ca0a8',
                        fontFamily: 'var(--font-geist-mono, monospace)',
                        letterSpacing: '0.02em',
                    }}
                >
                    {status}
                </div>
            )}

            {/* ── Messages ── */}
            <main
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#34363c transparent',
                }}
            >
                {messages.length === 0 && (
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            opacity: 0.6,
                            paddingBottom: '80px',
                        }}
                    >
                        <div
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${BRAND_GREEN}30 0%, transparent 70%)`,
                                border: `2px solid ${BRAND_GREEN}40`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.8rem',
                            }}
                        >
                            💬
                        </div>
                        <p style={{ color: '#b0b4bb', fontSize: '0.9rem', textAlign: 'center', maxWidth: '260px', margin: 0 }}>
                            {modelLoaded
                                ? 'Start typing to chat with the AI'
                                : 'Load a model above to start chatting'}
                        </p>
                        {!modelLoaded && (
                            <p style={{ color: '#555', fontSize: '0.75rem', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
                                All inference runs locally in your browser — no data is sent to any server.
                            </p>
                        )}
                    </div>
                )}

                {messages.map(msg => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-end',
                            gap: '8px',
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <div
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${BRAND_GREEN}40, ${BRAND_GREEN}20)`,
                                    border: `1px solid ${BRAND_GREEN}55`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    flexShrink: 0,
                                }}
                            >
                                🤖
                            </div>
                        )}

                        <div
                            style={{
                                maxWidth: '75%',
                                padding: '10px 14px',
                                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                backgroundColor: msg.role === 'user' ? `${BRAND_GREEN}22` : '#18191c',
                                border: `1px solid ${msg.role === 'user' ? BRAND_GREEN + '40' : '#2a2c31'}`,
                                fontSize: '0.9rem',
                                lineHeight: '1.6',
                                color: '#f2f3f5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                position: 'relative',
                            }}
                        >
                            {msg.content || (msg.streaming && (
                                <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                    {[0, 1, 2].map(i => (
                                        <span
                                            key={i}
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: BRAND_GREEN,
                                                display: 'inline-block',
                                                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                                            }}
                                        />
                                    ))}
                                </span>
                            ))}
                            {msg.streaming && msg.content && (
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: '2px',
                                        height: '1em',
                                        backgroundColor: BRAND_GREEN,
                                        marginLeft: '2px',
                                        verticalAlign: 'text-bottom',
                                        animation: 'blink 0.8s step-end infinite',
                                    }}
                                />
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, #3d5a80, #2c3e50)`,
                                    border: '1px solid #3d5a8088',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    flexShrink: 0,
                                }}
                            >
                                👤
                            </div>
                        )}
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </main>

            {/* ── Input area ── */}
            <footer
                style={{
                    padding: '12px 16px 20px',
                    borderTop: '1px solid #1e2024',
                    backgroundColor: '#0a0b0d',
                }}
            >
                <div
                    style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'flex-end',
                        backgroundColor: '#18191c',
                        border: `1px solid ${modelLoaded ? BRAND_GREEN + '44' : '#34363c'}`,
                        borderRadius: '14px',
                        padding: '8px 8px 8px 14px',
                        transition: 'border-color 0.2s',
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
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#f2f3f5',
                            fontSize: '0.9rem',
                            resize: 'none',
                            lineHeight: '1.5',
                            maxHeight: '160px',
                            overflow: 'auto',
                            fontFamily: 'inherit',
                        }}
                    />
                    <button
                        id="send-message-btn"
                        onClick={sendMessage}
                        disabled={!modelLoaded || isGenerating || !input.trim()}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            flexShrink: 0,
                            backgroundColor: modelLoaded && input.trim() && !isGenerating ? BUTTON_GREEN : '#232428',
                            border: 'none',
                            color: modelLoaded && input.trim() && !isGenerating ? '#fff' : '#555',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: modelLoaded && input.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                            fontSize: '1rem',
                            transition: 'background 0.2s, color 0.2s',
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
                <p
                    style={{
                        textAlign: 'center',
                        fontSize: '0.68rem',
                        color: '#555',
                        marginTop: '8px',
                    }}
                >
                    AI runs on your device via WebGPU · No data sent to servers
                </p>
            </footer>

            {/* ── Keyframe animations ── */}
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
