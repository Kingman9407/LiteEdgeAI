'use client';

import { useState, useRef } from 'react';
import * as webllm from '@mlc-ai/web-llm';

/* ================= TYPES ================= */
interface BenchmarkResult {
  name: string;
  prompt: string;
  response: string;
  tokensPerSecond: number;
  totalTime: number;
}

interface BenchmarkTest {
  name: string;
  description: string;
  prompt: string;
  category: 'speed' | 'reasoning' | 'creativity' | 'knowledge';
}

/* ================= BENCHMARK TESTS ================= */
const BENCHMARK_TESTS: BenchmarkTest[] = [
  {
    name: 'Speed Test',
    description: 'Tests raw generation speed',
    prompt: 'Count from 1 to 20.',
    category: 'speed',
  },
  {
    name: 'Math Reasoning',
    description: 'Basic arithmetic problem',
    prompt:
      'If John has 5 apples and buys 3 more, then gives 2 to his friend, how many apples does he have? Show your work.',
    category: 'reasoning',
  },
  {
    name: 'Logic Puzzle',
    description: 'Simple deduction task',
    prompt: 'All cats are animals. Fluffy is a cat. What can we conclude about Fluffy?',
    category: 'reasoning',
  },
  {
    name: 'Creative Writing',
    description: 'Story generation',
    prompt: 'Write a short 2-sentence story about a robot learning to dance.',
    category: 'creativity',
  },
  {
    name: 'General Knowledge',
    description: 'Factual recall',
    prompt: 'What is the capital of France? Provide a brief answer.',
    category: 'knowledge',
  },
  {
    name: 'Code Generation',
    description: 'Simple programming task',
    prompt: 'Write a Python function that returns the sum of two numbers.',
    category: 'reasoning',
  },
];

/* ================= COMPONENT ================= */
export default function WebLLMBenchmark() {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [status, setStatus] = useState('');

  /* ✅ VALID WEBLLM MODELS ONLY */
  const [selectedModel, setSelectedModel] = useState(
    'Llama-3.2-1B-Instruct-q4f16_1'
  );

  const engineRef = useRef<webllm.MLCEngine | null>(null);

  const availableModels = [
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B (Fastest)' },
    { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi-3 Mini (Balanced)' },
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 1.5B (Quality)' },
  ];

  /* ================= LOAD MODEL ================= */
  const loadModel = async () => {
    if (!navigator.gpu) {
      setStatus('❌ WebGPU not supported in this browser');
      return;
    }

    setStatus('🔄 Initializing WebLLM…');
    setModelLoaded(false);

    try {
      const engine = new webllm.MLCEngine();

      engine.setInitProgressCallback((report) => {
        setStatus(`📥 ${report.text}`);
      });

      await engine.reload(selectedModel);

      engineRef.current = engine;
      setModelLoaded(true);
      setStatus('✅ Model loaded successfully!');
    } catch (error: any) {
      setStatus(`❌ Error loading model: ${error.message || error}`);
    }
  };

  /* ================= CHAT ================= */
  const generate = async () => {
    if (!engineRef.current || !prompt) return;

    setLoading(true);
    setOutput('');

    const startTime = performance.now();

    try {
      const reply = await engineRef.current.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 256,
      });

      const duration = (performance.now() - startTime) / 1000;

      setOutput(reply.choices[0].message.content || '');
      setStatus(`⚡ Generated in ${duration.toFixed(2)}s`);
    } catch (error: any) {
      setOutput(`Error: ${error.message || error}`);
    }

    setLoading(false);
  };

  /* ================= BENCHMARK ================= */
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [currentTest, setCurrentTest] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'benchmark'>('chat');

  const runBenchmark = async () => {
    if (!engineRef.current) return;

    setBenchmarkRunning(true);
    setBenchmarkResults([]);
    setCurrentTest(0);

    const results: BenchmarkResult[] = [];

    for (let i = 0; i < BENCHMARK_TESTS.length; i++) {
      setCurrentTest(i + 1);
      const test = BENCHMARK_TESTS[i];

      const startTime = performance.now();

      try {
        const reply = await engineRef.current.chat.completions.create({
          messages: [{ role: 'user', content: test.prompt }],
          temperature: 0.7,
          max_tokens: 256,
        });

        const totalTime = (performance.now() - startTime) / 1000;
        const content = reply.choices[0].message.content || '';

        const estimatedTokens = content.split(/\s+/).length * 1.3;

        results.push({
          name: test.name,
          prompt: test.prompt,
          response: content,
          tokensPerSecond: estimatedTokens / totalTime,
          totalTime,
        });
      } catch (error: any) {
        results.push({
          name: test.name,
          prompt: test.prompt,
          response: `Error: ${error.message || error}`,
          tokensPerSecond: 0,
          totalTime: 0,
        });
      }

      setBenchmarkResults([...results]);
    }

    setBenchmarkRunning(false);
    setStatus('✅ Benchmark completed!');
  };

  const avgSpeed =
    benchmarkResults.reduce((s, r) => s + r.tokensPerSecond, 0) /
    (benchmarkResults.length || 1);

  const avgTime =
    benchmarkResults.reduce((s, r) => s + r.totalTime, 0) /
    (benchmarkResults.length || 1);

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <h1 className="text-4xl font-bold text-center">WebLLM Benchmark Suite</h1>

        {/* MODEL SELECT */}
        <div className="bg-white/10 p-4 rounded-lg">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={modelLoaded}
            className="w-full bg-black/30 p-3 rounded"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadModel}
            disabled={modelLoaded}
            className="mt-3 w-full bg-purple-600 py-3 rounded font-semibold"
          >
            {modelLoaded ? '✓ Model Loaded' : 'Load Model'}
          </button>

          {status && <p className="mt-2 text-sm font-mono">{status}</p>}
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('chat')} className="px-4 py-2 bg-white/10 rounded">
            Chat
          </button>
          <button onClick={() => setActiveTab('benchmark')} className="px-4 py-2 bg-white/10 rounded">
            Benchmark
          </button>
        </div>

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <textarea
              className="w-full bg-black/30 p-4 rounded"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={!modelLoaded}
            />

            <button
              onClick={generate}
              disabled={!modelLoaded || loading}
              className="w-full bg-green-600 py-3 rounded font-semibold"
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>

            {output && (
              <pre className="bg-black/30 p-4 rounded whitespace-pre-wrap">{output}</pre>
            )}
          </div>
        )}

        {/* BENCHMARK */}
        {activeTab === 'benchmark' && (
          <div className="space-y-4">
            <button
              onClick={runBenchmark}
              disabled={!modelLoaded || benchmarkRunning}
              className="w-full bg-blue-600 py-3 rounded font-semibold"
            >
              {benchmarkRunning
                ? `Running ${currentTest}/${BENCHMARK_TESTS.length}`
                : 'Run Benchmark'}
            </button>

            {benchmarkResults.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded">Avg tok/s: {avgSpeed.toFixed(1)}</div>
                <div className="bg-white/10 p-4 rounded">Avg time: {avgTime.toFixed(2)}s</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
