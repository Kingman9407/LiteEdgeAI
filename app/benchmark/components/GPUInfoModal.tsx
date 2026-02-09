'use client';

import { useGPUInfo } from '../hooks/useGPUInfo';

export function GPUInfoModal({
    open,
    onClose
}: {
    open: boolean;
    onClose: () => void;
}) {
    const gpuInfo = useGPUInfo(open);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center
            bg-black/70 backdrop-blur">

            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-black/90 p-6
                border border-emerald-500/30
                shadow-[0_0_30px_rgba(16,185,129,0.25)]">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-emerald-400">
                        GPU Specifications
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl px-2"
                    >
                        ✕
                    </button>
                </div>

                {!gpuInfo ? (
                    <div className="text-gray-400 text-center py-8">
                        <div className="animate-pulse">Detecting GPU...</div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <Section title="Performance Analysis">
                            <Spec label="Predicted Tier" value={
                                <span className={
                                    gpuInfo.predictedTier === 'High-End' ? 'text-green-400 font-bold' :
                                        gpuInfo.predictedTier === 'Mid-Range' ? 'text-yellow-400 font-bold' :
                                            gpuInfo.predictedTier === 'Low-End' ? 'text-orange-400 font-bold' :
                                                gpuInfo.predictedTier === 'Integrated' ? 'text-blue-400 font-bold' :
                                                    'text-gray-400'
                                }>
                                    {gpuInfo.predictedTier}
                                </span>
                            } />
                            <Spec label="Estimated VRAM" value={gpuInfo.predictedVRAM} />
                            <Spec label="Performance Score" value={`${gpuInfo.performanceScore}/100`} />
                            {gpuInfo.capabilities.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-emerald-500/10">
                                    <p className="text-sm text-gray-400 mb-2">Detected Capabilities:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {gpuInfo.capabilities.map((cap, i) => (
                                            <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 px-2 py-1 rounded">
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Section>
                        <Section title="Basic Information">
                            <Spec label="GPU Renderer" value={gpuInfo.renderer} />
                            <Spec label="Vendor" value={gpuInfo.vendor} />
                            <Spec label="Unmasked Renderer" value={gpuInfo.unmaskedRenderer || 'Not available'} />
                            <Spec label="Unmasked Vendor" value={gpuInfo.unmaskedVendor || 'Not available'} />
                        </Section>

                        {/* API Support */}
                        <Section title="Graphics API Support">
                            <Spec label="WebGL 1.0" value={gpuInfo.webgl ? '✓ Supported' : '✗ Not supported'} />
                            <Spec label="WebGL 2.0" value={gpuInfo.webgl2 ? '✓ Supported' : '✗ Not supported'} />
                            <Spec label="WebGPU" value={gpuInfo.webgpu ? '✓ Supported' : '✗ Not supported'} />
                            <Spec label="WebGL Version" value={gpuInfo.webglVersion} />
                            <Spec label="GLSL Version" value={gpuInfo.shadingLanguageVersion} />
                        </Section>

                        {/* Texture Limits */}
                        <Section title="Texture Capabilities">
                            <Spec label="Max Texture Size" value={`${gpuInfo.maxTextureSize}px`} />
                            <Spec label="Max Cube Map Size" value={`${gpuInfo.maxCubeMapSize}px`} />
                            <Spec label="Max Renderbuffer Size" value={`${gpuInfo.maxRenderbufferSize}px`} />
                            <Spec label="Max Texture Image Units" value={gpuInfo.maxTextureImageUnits} />
                            <Spec label="Max Combined Texture Units" value={gpuInfo.maxCombinedTextureImageUnits} />
                            <Spec label="Max Vertex Texture Units" value={gpuInfo.maxVertexTextureImageUnits} />
                            <Spec label="Max Anisotropy" value={gpuInfo.maxAnisotropy} />
                        </Section>

                        {/* Rendering Limits */}
                        <Section title="Rendering Capabilities">
                            <Spec label="Max Viewport Dimensions" value={`${gpuInfo.maxViewportWidth} × ${gpuInfo.maxViewportHeight}px`} />
                            <Spec label="Max Vertex Attributes" value={gpuInfo.maxVertexAttribs} />
                            <Spec label="Max Vertex Uniforms" value={gpuInfo.maxVertexUniformVectors} />
                            <Spec label="Max Fragment Uniforms" value={gpuInfo.maxFragmentUniformVectors} />
                            <Spec label="Max Varying Vectors" value={gpuInfo.maxVaryingVectors} />
                            <Spec label="Max Draw Buffers" value={gpuInfo.maxDrawBuffers} />
                            <Spec label="Max Color Attachments" value={gpuInfo.maxColorAttachments} />
                        </Section>

                        {/* Precision Support */}
                        <Section title="Shader Precision">
                            <Spec label="Vertex High Float" value={formatPrecision(gpuInfo.vertexShaderHighFloat)} />
                            <Spec label="Vertex Medium Float" value={formatPrecision(gpuInfo.vertexShaderMediumFloat)} />
                            <Spec label="Vertex Low Float" value={formatPrecision(gpuInfo.vertexShaderLowFloat)} />
                            <Spec label="Fragment High Float" value={formatPrecision(gpuInfo.fragmentShaderHighFloat)} />
                            <Spec label="Fragment Medium Float" value={formatPrecision(gpuInfo.fragmentShaderMediumFloat)} />
                            <Spec label="Fragment Low Float" value={formatPrecision(gpuInfo.fragmentShaderLowFloat)} />
                        </Section>

                        {/* Extensions */}
                        {gpuInfo.extensions && gpuInfo.extensions.length > 0 && (
                            <Section title={`WebGL Extensions (${gpuInfo.extensions.length})`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                    {gpuInfo.extensions.map((ext, i) => (
                                        <div key={i} className="text-xs font-mono text-emerald-300/80 bg-emerald-500/5 px-2 py-1 rounded">
                                            {ext}
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* WebGPU Info */}
                        {gpuInfo.webgpuAdapter && (
                            <Section title="WebGPU Adapter">
                                <Spec label="Architecture" value={gpuInfo.webgpuAdapter.architecture || 'Unknown'} />
                                <Spec label="Device" value={gpuInfo.webgpuAdapter.device || 'Unknown'} />
                                <Spec label="Vendor" value={gpuInfo.webgpuAdapter.vendor || 'Unknown'} />
                                <Spec label="Backend" value={gpuInfo.webgpuAdapter.backend || 'Unknown'} />
                            </Section>
                        )}

                        {/* Additional Info */}
                        <Section title="Additional Information">
                            <Spec label="Aliased Point Size Range" value={`${gpuInfo.aliasedPointSizeRange?.[0]} - ${gpuInfo.aliasedPointSizeRange?.[1]}`} />
                            <Spec label="Aliased Line Width Range" value={`${gpuInfo.aliasedLineWidthRange?.[0]} - ${gpuInfo.aliasedLineWidthRange?.[1]}`} />
                            <Spec label="Subpixel Bits" value={gpuInfo.subpixelBits} />
                            <Spec label="Samples" value={gpuInfo.samples} />
                        </Section>
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-3 pb-2 border-b border-emerald-500/30">
                {title}
            </h3>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
}

function Spec({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex justify-between border-b border-emerald-500/10 pb-1.5">
            <span className="text-gray-400 text-sm">{label}</span>
            <span className="text-emerald-300 font-mono text-sm text-right">{value}</span>
        </div>
    );
}

function formatPrecision(precision: any) {
    if (!precision) return 'Not available';
    return `Range: ${precision.rangeMin}-${precision.rangeMax}, Precision: ${precision.precision}`;
}