import { BenchmarkTest } from '../types/types';

export const BENCHMARKS = {
    normal: <BenchmarkTest[]>[
        {
            name: 'Speed Test',
            description: 'Basic generation speed',
            prompt: 'Count from 1 to 20.',
            category: 'speed',
        },
        {
            name: 'Math Reasoning',
            description: 'Simple arithmetic',
            prompt:
                'If John has 5 apples and buys 3 more, then gives 2 away, how many remain?',
            category: 'reasoning',
        },
        {
            name: 'Logic',
            description: 'Simple deduction',
            prompt:
                'All cats are animals. Fluffy is a cat. What can we conclude?',
            category: 'reasoning',
        },
    ],

    hard: <BenchmarkTest[]>[
        {
            name: 'Speed Stress Test',
            description: 'Long continuous generation',
            prompt:
                'Count from 1 to 1000. Write each number on a new line. Do not stop early.',
            category: 'speed',
        },
        {
            name: 'Heavy Math Reasoning',
            description: 'Long chain-of-thought math',
            prompt:
                'John starts with 125 apples. Every day for 10 days he buys 37 apples, '
                + 'gives away 19, and loses 4. Explain every step in detail.',
            category: 'reasoning',
        },
        {
            name: 'Creative Load',
            description: 'Large creative output',
            prompt:
                'Write a detailed 500-word story about a robot learning to dance, '
                + 'including dialogue, emotions, and internal thoughts.',
            category: 'creativity',
        },
    ],
};
