import React from "react";

type Color = "green" | "amber" | "blue";

type Step = {
    number: string;
    title: string;
    description: string;
    color: Color;
    highlight?: boolean;
    chips?: string[];
    icon: React.ReactNode;
};

const steps: Step[] = [
    {
        number: "01",
        title: "Use a Supported Browser",
        description:
            "Run benchmarks in Google Chrome, Microsoft Edge, or another Chromium-based browser. Set GPU preference to 'High performance' before running tests.",
        color: "green",
        icon: <div className="h-2 w-2 rounded-full bg-green-400" />,
    },
    {
        number: "02",
        title: "WebGL & WebGPU Support",
        description:
            "Both WebGL and WebGPU must be hardware accelerated. Visit chrome://gpu and confirm both show 'Hardware accelerated'.",
        color: "green",
        highlight: true,
        chips: ["WebGL", "WebGPU"],
        icon: <div className="h-2 w-2 rounded-full bg-green-400" />,
    },
    {
        number: "03",
        title: "Enable High Performance Mode",
        description:
            "Enable 'Use hardware acceleration when available' in browser settings. Switch to High Performance power plan to prevent throttling.",
        color: "amber",
        icon: <div className="h-2 w-2 rounded-full bg-amber-400" />,
    },
    {
        number: "04",
        title: "Close Background Tabs & Apps",
        description:
            "Close unnecessary tabs and background apps. Memory pressure will skew inference speed and efficiency scores.",
        color: "blue",
        icon: <div className="h-2 w-2 rounded-full bg-blue-400" />,
    },
    {
        number: "05",
        title: "Run Each Test Twice",
        description:
            "Perform a warm-up run before recording results. Submit only the second run.",
        color: "green",
        icon: <div className="h-2 w-2 rounded-full bg-green-400" />,
    },
];

const accent: Record<Color, string> = {
    green: "border-green-500/30",
    amber: "border-amber-400/30",
    blue: "border-blue-400/30",
};

export default function BenchmarkingProcedureSection() {
    return (
        <section className="w-full">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <header className="mb-12">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                        How to Run a{" "}
                        <span className="text-green-400">Valid Benchmark</span>
                    </h2>
                    <p className="text-neutral-400 max-w-xl">
                        Follow each step precisely. Skipping stages can invalidate your
                        submission or skew leaderboard rankings.
                    </p>
                </header>

                {/* Steps */}
                <ol className="grid md:grid-cols-2 gap-6">
                    {steps.map((step) => (
                        <li
                            key={step.number}
                            className={`relative rounded-xl border border-neutral-800 p-6 ${step.highlight ? "bg-neutral-900" : ""
                                } ${accent[step.color]}`}
                        >
                            <span className="absolute top-4 right-4 text-xs text-neutral-500 font-mono">
                                {step.number}
                            </span>

                            <div className="flex items-center gap-3 mb-3">
                                {step.icon}
                                <h3 className="font-semibold text-lg">{step.title}</h3>
                            </div>

                            {step.chips && (
                                <div className="flex gap-2 mb-3">
                                    {step.chips.map((chip) => (
                                        <span
                                            key={chip}
                                            className="text-xs px-2 py-1 bg-white text-black rounded font-mono"
                                        >
                                            {chip}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-sm text-neutral-400 leading-relaxed">
                                {step.description}
                            </p>
                        </li>
                    ))}
                </ol>

                {/* Footer Notice */}
                <div className="mt-10 rounded-lg border border-neutral-800 p-4 text-sm text-neutral-400">
                    All submitted scores are{" "}
                    <strong className="text-neutral-200">
                        verified server-side
                    </strong>
                    . Non-compliant submissions may be excluded from the leaderboard.
                </div>

            </div>
        </section>
    );
}