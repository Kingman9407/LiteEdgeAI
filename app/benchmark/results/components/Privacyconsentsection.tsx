interface PrivacyConsentSectionProps {
    agreed: boolean;
    onAgreedChange: (agreed: boolean) => void;
    onSubmit: () => void;
    onSkip: () => void;
    isSubmitting?: boolean;
}

/* ------------------ COLOR SYSTEM ------------------ */
const BRAND_GREEN = '#4fbf8a';
const BUTTON_GREEN = '#3fa77a';
const BUTTON_HOVER = '#357a5a';

export function PrivacyConsentSection({
    agreed,
    onAgreedChange,
    onSubmit,
    onSkip,
    isSubmitting,
}: PrivacyConsentSectionProps) {
    return (
        <div
            className="rounded-xl p-8 space-y-6"
            style={{
                backgroundColor: '#18191c',
                border: `1px solid ${BRAND_GREEN}33`,
            }}
        >
            {/* ================= What We Collect ================= */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-[#4fbf8a]">
                    What data is collected?
                </h2>

                <div className="grid gap-3 text-sm text-[#b0b4bb]">
                    <DataPoint label="Normalized GPU name" example="(e.g., Apple M4, NVIDIA RTX 3060)" />
                    <DataPoint label="GPU brand" />
                    <DataPoint label="Performance score" example="(0–100)" />
                    <DataPoint label="Performance tier" example="(High-End, Mid-Range, Low-End, Integrated)" />
                    <DataPoint label="Graphics backend" example="(WebGPU, WebGL2, or WebGL1)" />
                    <DataPoint label="Platform type" example="(Desktop or Mobile)" />
                    <DataPoint label="GPU capabilities" example="(WebGL extensions, texture limits, etc.)" />
                </div>
            </div>

            {/* ================= Privacy Guarantee ================= */}
            <div
                className="rounded-lg p-4 space-y-3"
                style={{
                    backgroundColor: `${BRAND_GREEN}14`,
                    border: `1px solid ${BRAND_GREEN}33`,
                }}
            >
                <h3 className="text-lg font-semibold text-[#4fbf8a] flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                    </svg>
                    Your privacy is protected
                </h3>

                <div className="text-sm text-[#b0b4bb] space-y-2">
                    <p>
                        All data is collected locally in your browser using standard WebGL/WebGPU APIs.
                    </p>
                    <p className="font-medium text-[#f2f3f5]">
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

            {/* ================= Consent Checkbox ================= */}
            <label className="flex items-start gap-3 cursor-pointer group">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => onAgreedChange(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded cursor-pointer"
                    style={{
                        accentColor: BRAND_GREEN,
                    }}
                />
                <span className="text-sm text-[#b0b4bb] group-hover:text-[#f2f3f5] transition">
                    I agree to share anonymous GPU performance data for benchmarking and a public leaderboard as described above.
                </span>
            </label>

            {/* ================= Action Buttons ================= */}
            <div className="flex gap-4 pt-4">
                <button
                    onClick={onSubmit}
                    disabled={!agreed || isSubmitting}
                    className="flex-1 py-3 rounded-lg font-semibold transition"
                    style={{
                        backgroundColor: agreed && !isSubmitting ? BUTTON_GREEN : '#34363c',
                        color: agreed && !isSubmitting ? '#ffffff' : '#9ca0a8',
                        cursor: agreed && !isSubmitting ? 'pointer' : 'not-allowed',
                    }}
                    onMouseEnter={(e) => {
                        if (agreed && !isSubmitting) {
                            e.currentTarget.style.backgroundColor = BUTTON_HOVER;
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (agreed && !isSubmitting) {
                            e.currentTarget.style.backgroundColor = BUTTON_GREEN;
                        }
                    }}
                >
                    {isSubmitting ? 'Submitting…' : 'Submit Results'}
                </button>

                <button
                    onClick={onSkip}
                    className="px-6 py-3 rounded-lg border font-medium transition"
                    style={{
                        borderColor: '#34363c',
                        backgroundColor: '#232428',
                        color: '#b0b4bb',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2c2e33';
                        e.currentTarget.style.color = '#f2f3f5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#232428';
                        e.currentTarget.style.color = '#b0b4bb';
                    }}
                >
                    Skip
                </button>
            </div>
        </div>
    );
}

/* ------------------ Helper ------------------ */

function DataPoint({ label, example }: { label: string; example?: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="mt-1 text-[#4fbf8a]">•</span>
            <span>
                <strong className="text-[#f2f3f5]">{label}</strong>
                {example && ` ${example}`}
            </span>
        </div>
    );
}
