'use client';

import { useState } from 'react';
import { SystemAndBenchmarkCards } from './Systemandbenchmarkcards';
import { PrivacyConsentSection } from './Privacyconsentsection';
import type { SubmitResultsPageProps } from '../../benchmark/types/types';

export function SubmitResultsPage({
    onSubmit,
    onSkip,
    benchmarkData,
    systemSpecs,
    benchmarkResults,
    fullGPUInfo
}: SubmitResultsPageProps) {
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = () => {
        if (agreed) {
            onSubmit();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
            <div className="max-w-4xl w-full space-y-6">

                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-bold tracking-wide
                        drop-shadow-[0_0_14px_rgba(34,197,94,0.6)]">
                        Submit Your Results
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Help build a community benchmark database
                    </p>
                </div>

                {/* System Information & Benchmark Results */}
                <SystemAndBenchmarkCards
                    systemSpecs={systemSpecs}
                    benchmarkData={benchmarkData}
                    benchmarkResults={benchmarkResults}
                    fullGPUInfo={fullGPUInfo}
                />

                {/* Privacy & Consent */}
                <PrivacyConsentSection
                    agreed={agreed}
                    onAgreedChange={setAgreed}
                    onSubmit={handleSubmit}
                    onSkip={onSkip}
                />

                {/* Footer Note */}
                <p className="text-center text-sm text-gray-500">
                    You can choose to submit or skip at any time
                </p>
            </div>
        </div>
    );
}