# LiteEdgeAI — Hardware AI Benchmark Platform

> **Benchmark and rank your hardware for AI performance using WebGPU. Run real AI models directly in your browser — no cloud, no server-side compute.**

🌐 **Live site:** [liteedgeai.com](https://liteedgeai.com)  
💬 **Community:** [discord.gg/teTMMXC7](https://discord.gg/teTMMXC7)

---

## What is LiteEdgeAI?

LiteEdgeAI is an independent, open hardware AI benchmarking platform. It runs real AI model inference directly on your device using **WebGPU**, **ONNX Runtime Web**, and **WebLLM** — with zero server-side compute involved. After running the benchmark, users can submit their verified results to a public **hardware ranking database**.

Marketing specs like clock speeds, core counts, and "AI TOPS" don't tell you how fast models actually run. LiteEdgeAI measures real-world AI inference performance on real consumer hardware — laptops, desktops, GPUs, integrated graphics, and NPUs.

---

## Features

| Feature | Description |
|---|---|
| 🧠 **In-Browser Inference** | Runs AI models entirely in the browser via WebGPU or ONNX Runtime Web. No data leaves your device. |
| ⚡ **Multi-Backend Support** | Supports **WebLLM** (direct MLC engine), **inferis-ml** (worker pool), and **ONNX Runtime Web** (Transformers.js). |
| 📊 **Benchmark Suite** | Normal, Hard, and Extreme difficulty levels measuring speed, reasoning, creativity, and sustained throughput. |
| 🏆 **Public Rankings** | Submit your results to the community hardware ranking database. Compare GPUs, iGPUs, and integrated graphics. |
| 💬 **Local AI Chat** | Chat with AI models running 100% on your device — no API keys, no subscriptions. |
| 📷 **Photo AI** | On-device image processing features powered by local ONNX models. |

---

## How It Works

```
1. Select & Load a Model
   ↳ Choose from the model selector. Models are fetched from Hugging Face
     and loaded locally in your browser.

2. Run the Benchmark
   ↳ Click Run to execute real AI inference using WebGPU or ONNX Runtime.
     No cloud execution — everything runs on your hardware.

3. Measure Performance
   ↳ We measure load time, first-token latency, throughput (tokens/sec),
     and sustained generation to calculate a normalized benchmark score.

4. Submit Results
   ↳ Optionally submit to the public ranking database. Your hardware details
     and performance metrics help build a community-verified leaderboard.
```

---

## Execution Backends

The app supports three inference backends, switchable from the UI:

| Backend | Technology | Best For |
|---|---|---|
| **ONNX Runtime Web** *(default)* | Transformers.js + ONNX Runtime | Cross-device compatibility, mobile, WASM fallback |
| **Direct WebLLM** | @mlc-ai/web-llm (MLC engine) | Desktops with strong WebGPU support |
| **inferis-ml** | Worker Pool, tab de-duplication | Background thread execution |

> On mobile or devices without WebGPU, the app automatically falls back to **ONNX Runtime Web (WASM CPU mode)**.

---

## Supported Models

### ONNX Runtime Web Models
| Model | Description |
|---|---|
| **Kingman Hornet** *(Default)* | `Kingman9407/hornet` — Custom lightweight LLaMA model, smallest & fastest |
| **In-House Hornet Model** | `onnx-community/SmolLM2-135M-Instruct` — Ultra-light ONNX model running only via WASM |

### WebLLM / MLC Models
| Model | Tag |
|---|---|
| Qwen 2.5 0.5B | Lightest |
| TinyLlama 1.1B | Light |
| Llama 3.2 1B | Fast |

---

## Benchmark Difficulty Levels

| Difficulty | Tests Included |
|---|---|
| **Normal** | Speed Test, Math Reasoning, Logic, Creative Short |
| **Hard** | Speed Stress, Heavy Math, Creative Load, Endurance |
| **Extreme** | Sprint, Mid Range, Long Haul, GPU Killer |

Each test measures **tokens/sec**, **first-token latency**, **word count**, and **response quality** to generate a final score used in hardware rankings.

---

## Site Pages

| Route | Description |
|---|---|
| `/` | Homepage with overview and links |
| `/benchmark` | Run the hardware AI benchmark |
| `/ranking` | Public hardware performance rankings |
| `/chat` | Local AI chat (no server, runs in browser) |
| `/photo` | On-device photo AI features |
| `/working` | Benchmark methodology explained |
| `/credits` | Credits and acknowledgements |

---

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
# Clone the repository
git clone <repo-url>
cd my-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The `predev` script automatically copies ONNX WASM binaries to `/public/` and builds the inferis-ml worker before starting the dev server.

### Build for Production

```bash
npm run build
npm start
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI Inference (ONNX) | [Transformers.js](https://huggingface.co/docs/transformers.js) + ONNX Runtime Web |
| AI Inference (WebLLM) | [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) |
| AI Inference (Worker) | inferis-ml (custom worker pool) |
| Model Hub | [Hugging Face](https://huggingface.co) |
| Deployment | [Vercel](https://vercel.com) |

---

## Why It Matters

- **Real AI Performance, Not Specs** — Clock speeds and "AI TOPS" don't reflect actual model inference speed. These benchmarks do.
- **Compare Before You Buy** — See how laptops, desktops, GPUs, and integrated graphics perform on the same workloads with no vendor bias.
- **Avoid Overpaying** — Identify best performance-per-price hardware options using community-verified data.
- **Know What Runs Locally** — Find out which hardware can load, run, and sustain local AI workloads reliably.
- **Future-Proof** — As local AI grows, real benchmarks help you choose hardware that stays relevant longer.
- **Community-Verified** — Results come from real users on real devices, making the ranking database stronger over time.

---

## Community

LiteEdgeAI is built for people experimenting with **edge AI** — running models locally, optimizing performance, and pushing AI beyond the cloud.

Topics include:
- Edge and on-device AI applications
- WebGPU and browser-based ML experiments
- Optimizing tokens-per-second on real hardware
- Local LLMs, vision models, and multimodal workloads
- Comparing GPUs, iGPUs, and NPUs for AI inference

> No sign-up required to benchmark. Join the Discord to collaborate, propose edge-AI projects, and help shape future experiments.

👉 [Join the Discord](https://discord.gg/teTMMXC7)

---

## License

© 2026 LiteEdgeAI. All rights reserved.  
See [Privacy Policy](https://liteedgeai.com/privacy) · [Terms of Service](https://liteedgeai.com/terms)
