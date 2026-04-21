"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const MODELS = [
  "det_10g.onnx",
  "w600k_r50.onnx"
];

export default function DownloadModelsPage() {
    const [status, setStatus] = useState<
        Record<string, { progress: number; state: "idle" | "downloading" | "done" | "error"; error?: string }>
    >({});
    const [totalProgress, setTotalProgress] = useState(0);

    // Get the base URL configured for Vercel Blob endpoints
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_MODELS_URL?.replace(/\/+$/, "") || "";

    useEffect(() => {
        // Initialize state
        const initial: any = {};
        MODELS.forEach((m) => {
            initial[m] = { progress: 0, state: "idle" };
        });
        setStatus(initial);
        checkCached();
    }, []);
    
    useEffect(() => {
        // Update total progress based on individual models
        let doneCount = 0;
        let sumProgress = 0;
        MODELS.forEach((m) => {
            const st = status[m];
            if (st) {
                if (st.state === "done") doneCount++;
                sumProgress += st.state === "done" ? 100 : st.progress;
            }
        });
        setTotalProgress(Math.round(sumProgress / (MODELS.length || 1)));
    }, [status]);

    const checkCached = async () => {
        if (!("caches" in window)) return;
        try {
            const cache = await caches.open("my-app-models");
            const keys = await cache.keys();
            
            setStatus((prev) => {
                const next = { ...prev };
                MODELS.forEach((modelName) => {
                    const isCached = keys.some((req) => req.url.endsWith(`/${modelName}`));
                    if (isCached) {
                        next[modelName] = { progress: 100, state: "done" };
                    }
                });
                return next;
            });
        } catch (err) {
            console.warn("Failed to check cache:", err);
        }
    };

    const downloadModel = async (modelName: string) => {
        if (!baseUrl) {
            setStatus((prev) => ({
                ...prev,
                [modelName]: { progress: 0, state: "error", error: "NEXT_PUBLIC_VERCEL_BLOB_MODELS_URL is not set." },
            }));
            return;
        }

        setStatus((prev) => ({ ...prev, [modelName]: { progress: 0, state: "downloading" } }));

        try {
            const fullUrl = `${baseUrl}/${modelName}`;
            const response = await fetch(fullUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            // Using clone() because we will write to cache AND read to calculate progress
            const clonedResponse = response.clone();
            const contentLength = response.headers.get("content-length");
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            let loaded = 0;
            const reader = response.body?.getReader();
            if (!reader) throw new Error("ReadableStream not supported by browser");

            const chunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    loaded += value.length;
                    if (total > 0) {
                        const currentProgress = Math.min(100, Math.round((loaded / total) * 100));
                        setStatus((prev) => ({
                            ...prev,
                            [modelName]: { progress: currentProgress, state: "downloading" },
                        }));
                    } else {
                        // Indeterminate progress if no content-length
                        setStatus((prev) => ({
                            ...prev,
                            [modelName]: { progress: 50, state: "downloading" },
                        }));
                    }
                }
            }

            // Successfully finished streaming the response
            // Now cache it for the application to use it
            if ("caches" in window) {
                const cache = await caches.open("my-app-models");
                await cache.put(fullUrl, clonedResponse);
            }

            setStatus((prev) => ({ ...prev, [modelName]: { progress: 100, state: "done" } }));
        } catch (err: any) {
            console.error(`Error downloading ${modelName}:`, err);
            setStatus((prev) => ({ ...prev, [modelName]: { progress: 0, state: "error", error: err.message } }));
        }
    };

    const downloadAll = () => {
        MODELS.forEach((modelName) => {
            const st = status[modelName];
            if (st && st.state !== "done" && st.state !== "downloading") {
                downloadModel(modelName);
            }
        });
    };

    const allDone = MODELS.every((m) => status[m]?.state === "done");

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
                        AI Model Setup
                    </h2>
                    <p className="mt-4 text-sm text-gray-600">
                        This application requires facial recognition models. Because they are large, they are
                        hosted remotely on Vercel Blob to avoid Git limits. Click the buttons below to download
                        them into your browser cache.
                    </p>
                </div>

                {!baseUrl && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <h4 className="text-yellow-800 font-semibold mb-1">Configuration Needed</h4>
                        <p className="text-yellow-700 text-sm">
                            Please set <code className="bg-yellow-100 text-yellow-900 px-1 py-0.5 rounded">NEXT_PUBLIC_VERCEL_BLOB_MODELS_URL</code> in your <code className="bg-yellow-100 text-yellow-900 px-1 py-0.5 rounded">.env.local</code> file pointing to your Vercel Blob public URL before downloading.
                        </p>
                    </div>
                )}

                <div className="mt-8 space-y-5">
                    {MODELS.map((model) => {
                        const st = status[model];
                        return (
                            <div key={model} className="bg-white px-4 py-5 sm:p-6 rounded-lg border border-gray-200">
                                <div className="sm:flex sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900 break-all">{model}</h3>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {model === "det_10g.onnx" && "Face detection model (~16MB)"}
                                            {model === "w600k_r50.onnx" && "Face recognition model (~85MB)"}
                                        </div>
                                    </div>
                                    <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 flex items-center">
                                        {st?.state === "done" && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Cached
                                            </span>
                                        )}
                                        {st?.state === "error" && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Error
                                            </span>
                                        )}
                                        {st?.state !== "done" && st?.state !== "downloading" && baseUrl && (
                                            <button
                                                type="button"
                                                onClick={() => downloadModel(model)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                {st?.state === "error" ? "Retry" : "Download"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {st?.state === "downloading" && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Downloading...</span>
                                            <span>{st.progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${st.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                
                                {st?.state === "error" && (
                                    <div className="mt-2 text-xs text-red-600">{st.error}</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6 mt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-gray-700">Total Progress</span>
                        <span className="text-sm font-bold text-gray-900">{totalProgress}%</span>
                    </div>
                    {totalProgress > 0 && totalProgress < 100 && (
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                            <div
                                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${totalProgress}%` }}
                            ></div>
                        </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                        {!allDone && baseUrl && (
                            <button
                                onClick={downloadAll}
                                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Download Missing Models
                            </button>
                        )}
                        
                        <Link
                            href="/photo"
                            className={`flex-1 flex justify-center py-2 px-4 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                allDone 
                                    ? "border-transparent text-white bg-green-600 hover:bg-green-700" 
                                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                            }`}
                        >
                            {allDone ? "Continue to App" : "Skip to App (Models may load slowly)"}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
