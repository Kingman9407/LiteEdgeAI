import { useState, useEffect } from 'react';

interface GPUInfo {
    // Basic Info
    renderer: string;
    vendor: string;
    unmaskedRenderer?: string;
    unmaskedVendor?: string;

    // API Support
    webgl: boolean;
    webgl2: boolean;
    webgpu: boolean;
    webglVersion: string;
    shadingLanguageVersion: string;

    // Texture Limits
    maxTextureSize: number;
    maxCubeMapSize: number;
    maxRenderbufferSize: number;
    maxTextureImageUnits: number;
    maxCombinedTextureImageUnits: number;
    maxVertexTextureImageUnits: number;
    maxAnisotropy: number;

    // Rendering Limits
    maxViewportWidth: number;
    maxViewportHeight: number;
    maxVertexAttribs: number;
    maxVertexUniformVectors: number;
    maxFragmentUniformVectors: number;
    maxVaryingVectors: number;
    maxDrawBuffers: number;
    maxColorAttachments: number;

    // Precision
    vertexShaderHighFloat: PrecisionFormat;
    vertexShaderMediumFloat: PrecisionFormat;
    vertexShaderLowFloat: PrecisionFormat;
    fragmentShaderHighFloat: PrecisionFormat;
    fragmentShaderMediumFloat: PrecisionFormat;
    fragmentShaderLowFloat: PrecisionFormat;

    // Extensions
    extensions: string[];

    // WebGPU
    webgpuAdapter?: {
        architecture?: string;
        device?: string;
        vendor?: string;
        backend?: string;
    };

    // Additional
    aliasedPointSizeRange?: [number, number];
    aliasedLineWidthRange?: [number, number];
    subpixelBits: number;
    samples: number;

    // Predictions
    predictedTier: 'High-End' | 'Mid-Range' | 'Low-End' | 'Integrated' | 'Unknown';
    predictedVRAM: string;
    performanceScore: number;
    capabilities: string[];
}

interface PrecisionFormat {
    rangeMin: number;
    rangeMax: number;
    precision: number;
}

function predictGPUTier(info: {
    maxTextureSize: number;
    maxViewportWidth: number;
    maxViewportHeight: number;
    maxAnisotropy: number;
    webgl2: boolean;
    webgpu: boolean;
    renderer: string;
    unmaskedRenderer?: string;
    maxDrawBuffers: number;
    extensions: string[];
}): {
    tier: 'High-End' | 'Mid-Range' | 'Low-End' | 'Integrated' | 'Unknown';
    vram: string;
    score: number;
    capabilities: string[];
} {
    let score = 0;
    const capabilities: string[] = [];
    const rendererLower = (info.unmaskedRenderer || info.renderer).toLowerCase();

    // Analyze renderer string for known GPUs
    const isNvidia = rendererLower.includes('nvidia') || rendererLower.includes('geforce') || rendererLower.includes('rtx') || rendererLower.includes('gtx');
    const isAMD = rendererLower.includes('amd') || rendererLower.includes('radeon') || rendererLower.includes('rx ');
    const isIntel = rendererLower.includes('intel') && (rendererLower.includes('hd') || rendererLower.includes('uhd') || rendererLower.includes('iris'));
    const isApple = rendererLower.includes('apple') || rendererLower.includes('m1') || rendererLower.includes('m2') || rendererLower.includes('m3') || rendererLower.includes('m4');

    // High-end GPU markers
    const isRTX40 = rendererLower.includes('rtx 40') || rendererLower.includes('4090') || rendererLower.includes('4080') || rendererLower.includes('4070');
    const isRTX30 = rendererLower.includes('rtx 30') || rendererLower.includes('3090') || rendererLower.includes('3080') || rendererLower.includes('3070') || rendererLower.includes('3060');
    const isRX7000 = rendererLower.includes('rx 7') || rendererLower.includes('7900') || rendererLower.includes('7800') || rendererLower.includes('7700');
    const isRX6000 = rendererLower.includes('rx 6') || rendererLower.includes('6900') || rendererLower.includes('6800') || rendererLower.includes('6700');
    const isAppleSilicon = rendererLower.includes('m1') || rendererLower.includes('m2') || rendererLower.includes('m3') || rendererLower.includes('m4');

    // WebGPU support (modern GPUs)
    if (info.webgpu) {
        score += 25;
        capabilities.push('WebGPU Ready');
    }

    // WebGL 2.0 support
    if (info.webgl2) {
        score += 15;
        capabilities.push('WebGL 2.0');
    }

    // Texture size (bigger = more VRAM)
    if (info.maxTextureSize >= 16384) {
        score += 30;
        capabilities.push('Large Textures (16K+)');
    } else if (info.maxTextureSize >= 8192) {
        score += 20;
        capabilities.push('Medium Textures (8K+)');
    } else if (info.maxTextureSize >= 4096) {
        score += 10;
        capabilities.push('Standard Textures (4K+)');
    }

    // Viewport dimensions
    if (info.maxViewportWidth >= 16384) {
        score += 20;
        capabilities.push('High Resolution (16K viewport)');
    } else if (info.maxViewportWidth >= 8192) {
        score += 15;
        capabilities.push('4K/8K Resolution');
    }

    // Anisotropic filtering
    if (info.maxAnisotropy >= 16) {
        score += 15;
        capabilities.push('16x Anisotropic Filtering');
    } else if (info.maxAnisotropy >= 8) {
        score += 10;
    }

    // Multiple render targets
    if (info.maxDrawBuffers >= 8) {
        score += 15;
        capabilities.push('Advanced Rendering (8+ buffers)');
    } else if (info.maxDrawBuffers >= 4) {
        score += 10;
    }

    // Advanced extensions
    const hasComputeShaders = info.extensions.some(ext => ext.includes('compute'));
    const hasFloatTextures = info.extensions.some(ext => ext.includes('float') || ext.includes('half_float'));
    const hasInstancing = info.extensions.some(ext => ext.includes('instanced'));
    const hasSRGB = info.extensions.some(ext => ext.toLowerCase().includes('srgb'));

    if (hasComputeShaders) {
        score += 10;
        capabilities.push('Compute Shaders');
    }
    if (hasFloatTextures) {
        score += 5;
        capabilities.push('HDR Textures');
    }
    if (hasInstancing) {
        score += 5;
        capabilities.push('Instanced Rendering');
    }

    // Determine tier based on renderer and score
    let tier: 'High-End' | 'Mid-Range' | 'Low-End' | 'Integrated' | 'Unknown' = 'Unknown';
    let vram = 'Unknown';

    if (isRTX40) {
        tier = 'High-End';
        vram = rendererLower.includes('4090') ? '24GB' : rendererLower.includes('4080') ? '12-16GB' : '8-12GB';
        score += 30;
    } else if (isRTX30) {
        tier = 'High-End';
        vram = rendererLower.includes('3090') ? '24GB' : rendererLower.includes('3080') ? '10-12GB' : '8GB';
        score += 25;
    } else if (isRX7000 || isRX6000) {
        tier = 'High-End';
        vram = '8-16GB';
        score += 25;
    } else if (isAppleSilicon) {
        tier = rendererLower.includes('max') || rendererLower.includes('ultra') ? 'High-End' : 'Mid-Range';
        vram = 'Unified Memory';
        score += rendererLower.includes('max') ? 25 : 20;
    } else if (isIntel) {
        tier = 'Integrated';
        vram = 'Shared System RAM';
        score = Math.min(score, 40); // Cap score for integrated
    } else {
        // Use score-based classification
        if (score >= 80) {
            tier = 'High-End';
            vram = '8GB+';
        } else if (score >= 60) {
            tier = 'Mid-Range';
            vram = '4-8GB';
        } else if (score >= 40) {
            tier = 'Low-End';
            vram = '2-4GB';
        } else if (score >= 20) {
            tier = 'Integrated';
            vram = 'Shared';
        }
    }

    // Additional capability detection
    if (isNvidia) capabilities.push('NVIDIA GPU');
    if (isAMD) capabilities.push('AMD GPU');
    if (isApple) capabilities.push('Apple Silicon');
    if (info.extensions.length > 30) capabilities.push(`${info.extensions.length} Extensions`);

    return {
        tier,
        vram,
        score: Math.min(100, score),
        capabilities
    };
}

export function useGPUInfo(enabled: boolean): GPUInfo | null {
    const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);

    useEffect(() => {
        if (!enabled) return;

        async function detectGPU() {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') as WebGLRenderingContext | null ||
                canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
            const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;

            if (!gl) {
                setGpuInfo({
                    renderer: 'WebGL not supported',
                    vendor: 'Unknown',
                    webgl: false,
                    webgl2: false,
                    webgpu: false,
                    webglVersion: 'N/A',
                    shadingLanguageVersion: 'N/A',
                    maxTextureSize: 0,
                    maxCubeMapSize: 0,
                    maxRenderbufferSize: 0,
                    maxTextureImageUnits: 0,
                    maxCombinedTextureImageUnits: 0,
                    maxVertexTextureImageUnits: 0,
                    maxAnisotropy: 0,
                    maxViewportWidth: 0,
                    maxViewportHeight: 0,
                    maxVertexAttribs: 0,
                    maxVertexUniformVectors: 0,
                    maxFragmentUniformVectors: 0,
                    maxVaryingVectors: 0,
                    maxDrawBuffers: 0,
                    maxColorAttachments: 0,
                    vertexShaderHighFloat: { rangeMin: 0, rangeMax: 0, precision: 0 },
                    vertexShaderMediumFloat: { rangeMin: 0, rangeMax: 0, precision: 0 },
                    vertexShaderLowFloat: { rangeMin: 0, rangeMax: 0, precision: 0 },
                    fragmentShaderHighFloat: { rangeMin: 0, rangeMax: 0, precision: 0 },
                    fragmentShaderMediumFloat: { rangeMin: 0, rangeMax: 0, precision: 0 },
                    fragmentShaderLowFloat: { rangeMin: 0, rangeMax: 0, precision: 0 },
                    extensions: [],
                    subpixelBits: 0,
                    samples: 0,
                    predictedTier: 'Unknown',
                    predictedVRAM: 'N/A',
                    performanceScore: 0,
                    capabilities: []
                });
                return;
            }

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const anisotropyExt = gl.getExtension('EXT_texture_filter_anisotropic') ||
                gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

            const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as number[];

            const getPrecision = (shaderType: number, precisionType: number): PrecisionFormat => {
                const format = gl.getShaderPrecisionFormat(shaderType, precisionType);
                return {
                    rangeMin: format?.rangeMin || 0,
                    rangeMax: format?.rangeMax || 0,
                    precision: format?.precision || 0,
                };
            };

            // WebGPU detection
            let webgpuSupported = false;
            let webgpuAdapterInfo: any = undefined;

            if ('gpu' in navigator) {
                try {
                    const adapter = await (navigator as any).gpu.requestAdapter();
                    if (adapter) {
                        webgpuSupported = true;
                        const info = await adapter.requestAdapterInfo?.();
                        if (info) {
                            webgpuAdapterInfo = {
                                architecture: info.architecture,
                                device: info.device,
                                vendor: info.vendor,
                                backend: info.backend,
                            };
                        }
                    }
                } catch (e) {
                    console.warn('WebGPU detection failed:', e);
                }
            }

            const renderer = gl.getParameter(gl.RENDERER) as string;
            const unmaskedRenderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string : undefined;
            const extensions = gl.getSupportedExtensions() || [];
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
            const maxAnisotropy = anisotropyExt ? gl.getParameter((anisotropyExt as any).MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number : 0;
            const maxDrawBuffers = gl2 ? gl2.getParameter(gl2.MAX_DRAW_BUFFERS) as number : 1;

            // Predict GPU tier
            const prediction = predictGPUTier({
                maxTextureSize,
                maxViewportWidth: viewport[0],
                maxViewportHeight: viewport[1],
                maxAnisotropy,
                webgl2: !!gl2,
                webgpu: webgpuSupported,
                renderer,
                unmaskedRenderer,
                maxDrawBuffers,
                extensions
            });

            const info: GPUInfo = {
                // Basic Info
                renderer,
                vendor: gl.getParameter(gl.VENDOR) as string,
                unmaskedRenderer,
                unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string : undefined,

                // API Support
                webgl: true,
                webgl2: !!gl2,
                webgpu: webgpuSupported,
                webglVersion: gl.getParameter(gl.VERSION) as string,
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) as string,

                // Texture Limits
                maxTextureSize,
                maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) as number,
                maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
                maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
                maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) as number,
                maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) as number,
                maxAnisotropy,

                // Rendering Limits
                maxViewportWidth: viewport[0],
                maxViewportHeight: viewport[1],
                maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number,
                maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
                maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number,
                maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS) as number,
                maxDrawBuffers,
                maxColorAttachments: gl2 ? gl2.getParameter(gl2.MAX_COLOR_ATTACHMENTS) as number : 1,

                // Precision
                vertexShaderHighFloat: getPrecision(gl.VERTEX_SHADER, gl.HIGH_FLOAT),
                vertexShaderMediumFloat: getPrecision(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
                vertexShaderLowFloat: getPrecision(gl.VERTEX_SHADER, gl.LOW_FLOAT),
                fragmentShaderHighFloat: getPrecision(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
                fragmentShaderMediumFloat: getPrecision(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
                fragmentShaderLowFloat: getPrecision(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),

                // Extensions
                extensions,

                // WebGPU
                webgpuAdapter: webgpuAdapterInfo,

                // Additional
                aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as [number, number],
                aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE) as [number, number],
                subpixelBits: gl.getParameter(gl.SUBPIXEL_BITS) as number,
                samples: gl.getParameter(gl.SAMPLES) as number,

                // Predictions
                predictedTier: prediction.tier,
                predictedVRAM: prediction.vram,
                performanceScore: prediction.score,
                capabilities: prediction.capabilities
            };

            setGpuInfo(info);
        }

        detectGPU();
    }, [enabled]);

    return gpuInfo;
}