import { useState } from 'react';

interface Props {
    disabled: boolean;
    onGenerate: (prompt: string) => Promise<string>;
}

export function ChatPanel({ disabled, onGenerate }: Props) {
    const [prompt, setPrompt] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        const res = await onGenerate(prompt);
        setOutput(res);
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <textarea
                className="w-full bg-black/30 p-4 rounded"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={disabled}
            />

            <button
                onClick={handleGenerate}
                disabled={disabled || loading}
                className="w-full bg-green-600 py-3 rounded"
            >
                {loading ? 'Generating…' : 'Generate'}
            </button>

            {output && <pre className="bg-black/30 p-4 rounded">{output}</pre>}
        </div>
    );
}
