import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  /**
   * Required for:
   * - WebGPU
   * - WebLLM
   * - SharedArrayBuffer
   * - WASM threading
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },

  /**
   * Webpack config for production
   */
  webpack: (config, { isServer }) => {
    // Prevent bundling native ONNX binaries on server
    if (isServer) {
      config.externals.push("onnxruntime-node");
    }

    // Prevent Node.js core modules from being bundled into client
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
