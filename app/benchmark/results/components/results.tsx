'use client';

import { useState } from 'react';
import { SystemAndBenchmarkCards } from './Systemandbenchmarkcards';
import { PrivacyConsentSection } from './Privacyconsentsection';
import { submitBenchmarkToSupabase } from '../../services/supabase';
import type { SubmitResultsPageProps } from '../../types/types';

/* ------------------ COLOR SYSTEM ------------------ */
const BRAND_GREEN = '#4fbf8a';

export function SubmitResultsPage({
    onSubmit,
    onSkip,
    benchmarkData,
    systemSpecs,
    benchmarkResults,
    modelName,
}: SubmitResultsPageProps) {
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!agreed) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

            const modelNameToSubmit =
                modelName || benchmarkResults?.modelName || 'Unknown Model';

            const result = await submitBenchmarkToSupabase({
                modelName: modelNameToSubmit,
                systemSpecs,
                benchmarkData,
                benchmarkResults,
                sessionId,
            });

            if (result.success) {
                onSubmit();
            } else {
                setError('error' in result ? result.error : 'Failed to submit benchmark');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#18191c] text-[#b0b4bb] p-6 flex items-center justify-center">
            <div className="max-w-5xl w-full space-y-6 pt-30">

                {/* ================= Header ================= */}
                <div className="text-center space-y-3">
                    <h1
                        className="text-4xl font-bold tracking-wide text-[#f2f3f5]"

                    >
                        Submit Your Results
                    </h1>
                    <p className="text-[#7d818a] text-lg">
                        Help build a community benchmark database
                    </p>
                </div>

                {/* ================= Results Cards ================= */}
                <SystemAndBenchmarkCards
                    systemSpecs={systemSpecs}
                    benchmarkData={benchmarkData}
                    benchmarkResults={benchmarkResults}
                />

                {/* ================= Error ================= */}
                {error && (
                    <div
                        className="rounded-lg p-4 text-center border"
                        style={{
                            backgroundColor: '#2a1d1d',
                            borderColor: '#7a3535',
                            color: '#fca5a5',
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* ================= Privacy / Submit ================= */}
                <PrivacyConsentSection
                    agreed={agreed}
                    onAgreedChange={setAgreed}
                    onSubmit={handleSubmit}
                    onSkip={onSkip}
                    isSubmitting={isSubmitting}
                />

                {/* ================= Footer Note ================= */}
                <p className="text-center text-sm text-[#7d818a]">
                    You can choose to submit or skip at any time
                </p>
            </div>
        </div>
    );
}
