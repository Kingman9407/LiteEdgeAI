'use client';

import { useState } from 'react';
import { SystemAndBenchmarkCards } from './Systemandbenchmarkcards';
import { PrivacyConsentSection } from './Privacyconsentsection';
import { submitBenchmarkToSupabase } from '../../services/supabase';
import type { SubmitResultsPageProps } from '../../types/types';

export function SubmitResultsPage({
    onSubmit,
    onSkip,
    benchmarkData,
    systemSpecs,
    benchmarkResults,
    modelName  // ✅ Now part of SubmitResultsPageProps
}: SubmitResultsPageProps) {  // ✅ Remove the & { modelName: string }
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!agreed) return;

        // 👇 PRINT DATA WHEN SUBMIT IS PRESSED
        console.log('📊 Benchmark Data:', benchmarkData);
        console.log('📈 Benchmark Results:', benchmarkResults);
        console.log('🖥️ System Specs:', systemSpecs);

        setIsSubmitting(true);
        setError(null);

        try {
            const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const modelNameToSubmit =
                modelName || benchmarkResults?.modelName || 'Unknown Model';

            const result = await submitBenchmarkToSupabase({
                modelName: modelNameToSubmit,
                systemSpecs,
                benchmarkData,
                benchmarkResults,
                sessionId
            });

            if (result.success) {
                onSubmit();
            } else {
                setError('Failed to submit benchmark');
            }
        } catch (err) {
            console.error('Error submitting benchmark:', err);
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
            <div className="max-w-4xl w-full space-y-6">
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-bold tracking-wide
                        drop-shadow-[0_0_14px_rgba(34,197,94,0.6)]">
                        Submit Your Results
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Help build a community benchmark database
                    </p>
                </div>

                <SystemAndBenchmarkCards
                    systemSpecs={systemSpecs}
                    benchmarkData={benchmarkData}
                    benchmarkResults={benchmarkResults}
                />

                {error && (
                    <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-center">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                <PrivacyConsentSection
                    agreed={agreed}
                    onAgreedChange={setAgreed}
                    onSubmit={handleSubmit}
                    onSkip={onSkip}
                    isSubmitting={isSubmitting}
                />

                <p className="text-center text-sm text-gray-500">
                    You can choose to submit or skip at any time
                </p>
            </div>
        </div>
    );
}