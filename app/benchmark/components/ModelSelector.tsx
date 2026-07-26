'use client';

import { useEffect, useState } from 'react';

const BRAND_GREEN   = '#4fbf8a';
const HORNET_AMBER  = '#f5a623';
const HORNET_DARK   = '#c47d0a';
const INFERIS_BLUE  = '#5b8ef5';
const INFERIS_DARK  = '#3a6ad4';

export type ModelChoice = 'hornet' | 'inferis';

interface ModelSelectorProps {
    choice:          ModelChoice;
    setChoice:       (v: ModelChoice) => void;
    loadModel:       () => void;
    unloadModel:     () => void;
    modelLoaded:     boolean;
    status:          string;
    isMobile:        boolean;
}

export function ModelSelector({
    choice,
    setChoice,
    loadModel,
    unloadModel,
    modelLoaded,
    status,
    isMobile,
}: ModelSelectorProps) {
    const isHornet  = choice === 'hornet';
    const activeColor    = isHornet ? HORNET_AMBER  : INFERIS_BLUE;
    const activeColorDark = isHornet ? HORNET_DARK  : INFERIS_DARK;

    return (
        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#18191c', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ─── Section title ─── */}
            <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6e7278', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Select Model
                </p>
            </div>

            {/* ─── Model Cards ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>

                {/* ── inferis-ml card (all devices) ── */}
                <button
                    id="model-card-inferis"
                    disabled={modelLoaded}
                    onClick={() => setChoice('inferis')}
                    style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${choice === 'inferis' ? INFERIS_BLUE : '#2a2c31'}`,
                        backgroundColor: choice === 'inferis' ? `${INFERIS_BLUE}12` : '#111214',
                        cursor: modelLoaded ? 'not-allowed' : 'pointer',
                        opacity: modelLoaded && choice !== 'inferis' ? 0.4 : 1,
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        boxShadow: choice === 'inferis' ? `0 0 16px ${INFERIS_BLUE}28` : 'none',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: INFERIS_BLUE,
                            boxShadow: choice === 'inferis' ? `0 0 6px ${INFERIS_BLUE}99` : 'none',
                            display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: choice === 'inferis' ? INFERIS_BLUE : '#f2f3f5' }}>
                            inferis-ml
                        </span>
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '99px',
                            backgroundColor: `${BRAND_GREEN}22`,
                            color: BRAND_GREEN,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}>
                            All Devices
                        </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#9ca0a8', margin: 0, lineHeight: 1.5 }}>
                        Qwen 2.5 0.5B · WebGPU + WASM fallback<br />
                        Worker pool · background thread
                    </p>
                </button>

                {/* ── SmolLM2 card (all devices) ── */}
                <button
                    id="model-card-hornet"
                    disabled={modelLoaded}
                    onClick={() => setChoice('hornet')}
                    style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${choice === 'hornet' ? HORNET_AMBER : '#2a2c31'}`,
                        backgroundColor: choice === 'hornet' ? `${HORNET_AMBER}12` : '#111214',
                        cursor: modelLoaded ? 'not-allowed' : 'pointer',
                        opacity: modelLoaded && choice !== 'hornet' ? 0.4 : 1,
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        boxShadow: choice === 'hornet' ? `0 0 16px ${HORNET_AMBER}28` : 'none',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: HORNET_AMBER,
                            boxShadow: choice === 'hornet' ? `0 0 6px ${HORNET_AMBER}99` : 'none',
                            display: 'inline-block', flexShrink: 0,
                        }} />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: choice === 'hornet' ? HORNET_AMBER : '#f2f3f5' }}>
                            SmolLM2 135M
                        </span>
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '99px',
                            backgroundColor: `${HORNET_AMBER}22`,
                            color: HORNET_AMBER,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}>
                            All Devices
                        </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#9ca0a8', margin: 0, lineHeight: 1.5 }}>
                        SmolLM2 135M · ONNX WASM · Smallest model<br />
                        Fully offline · CPU inference
                    </p>
                </button>

            </div>

            {/* ─── Load / Unload button ─── */}
            {!modelLoaded ? (
                <button
                    id="load-model-btn"
                    onClick={loadModel}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: activeColor,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        boxShadow: `0 4px 14px ${activeColor}33`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = activeColorDark)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = activeColor)}
                >
                    {isHornet ? 'Load SmolLM2 135M' : 'Load inferis-ml'}
                </button>
            ) : (
                <button
                    id="unload-model-btn"
                    onClick={unloadModel}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#7a3535',
                        color: '#f2f3f5',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5f2a2a')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7a3535')}
                >
                    Unload Model
                </button>
            )}

            {/* ─── Status ─── */}
            {status && (
                <p
                    style={{
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#111214',
                        border: '1px solid #2a2c31',
                        color: status.startsWith('❌') ? '#ef4444' : status.startsWith('✅') ? BRAND_GREEN : '#9ca0a8',
                        margin: 0,
                        lineHeight: 1.6,
                        wordBreak: 'break-word',
                    }}
                >
                    {status}
                </p>
            )}
        </div>
    );
}
