import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * REQUIRED for WebGPU / WebLLM
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
   * Explicitly disable Turbopack
   * (Empty object is valid)
   */
  turbopack: {},

  /**
   * Force Webpack configuration
   */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("onnxruntime-node");
    }

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
