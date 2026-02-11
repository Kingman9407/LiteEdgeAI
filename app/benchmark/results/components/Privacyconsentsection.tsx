interface PrivacyConsentSectionProps {
    agreed: boolean;
    onAgreedChange: (agreed: boolean) => void;
    onSubmit: () => void;
    onSkip: () => void;
    isSubmitting?: boolean;
}

export function PrivacyConsentSection({
    agreed,
    onAgreedChange,
    onSubmit,
    onSkip,
    isSubmitting  // ✅ Add this to the destructured parameters
}: PrivacyConsentSectionProps) {
    return (
        <div className="rounded-xl bg-black/80 backdrop-blur p-8
            border border-emerald-500/20
            shadow-[0_0_22px_rgba(16,185,129,0.15)]
            space-y-6">

            {/* What We Collect */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-emerald-400">
                    What data is collected?
                </h2>

                <div className="grid gap-3 text-sm text-gray-300">
                    <DataPoint label="Normalized GPU name" example="(e.g., Apple M4, NVIDIA RTX 3060)" />
                    <DataPoint label="GPU brand" />
                    <DataPoint label="Performance score" example="(0–100)" />
                    <DataPoint label="Performance tier" example="(High-End, Mid-Range, Low-End, Integrated)" />
                    <DataPoint label="Graphics backend" example="(WebGPU, WebGL2, or WebGL1)" />
                    <DataPoint label="Platform type" example="(Desktop or Mobile)" />
                    <DataPoint label="GPU capabilities" example="(WebGL extensions, texture limits, etc.)" />
                </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-3">
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Your privacy is protected
                </h3>

                <div className="text-sm text-gray-300 space-y-2">
                    <p>
                        All data is collected locally in your browser using standard WebGL/WebGPU APIs.
                    </p>
                    <p className="font-medium text-white">
                        We do NOT collect or store:
                    </p>
                    <div className="grid gap-1 pl-4">
                        <span>✗ Raw hardware identifiers</span>
                        <span>✗ Driver details</span>
                        <span>✗ IP addresses</span>
                        <span>✗ Cookies</span>
                        <span>✗ Account data</span>
                        <span>✗ Any personal information</span>
                    </div>
                </div>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => onAgreedChange(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-emerald-500/30 
                        bg-black/50 text-emerald-500 
                        focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0
                        cursor-pointer"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition">
                    I agree to share anonymous GPU performance data for benchmarking and a public leaderboard as described above.
                </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
                <button
                    onClick={onSubmit}
                    disabled={!agreed || isSubmitting}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${agreed && !isSubmitting
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Results'}
                </button>

                <button
                    onClick={onSkip}
                    className="px-6 py-3 rounded-lg border transition
                        border-gray-600 bg-gray-800/30 text-gray-300
                        hover:bg-gray-700/30 hover:border-gray-500 hover:text-white
                        font-medium"
                >
                    Skip
                </button>
            </div>
        </div>
    );
}

// Helper component
function DataPoint({ label, example }: { label: string; example?: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span>
                <strong className="text-white">{label}</strong>
                {example && ` ${example}`}
            </span>
        </div>
    );
}