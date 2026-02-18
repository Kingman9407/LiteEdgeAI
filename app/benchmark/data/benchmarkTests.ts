// benchmarkTests.ts
import { BenchmarkTest } from '../types/types';

export const BENCHMARKS = {
    normal: <BenchmarkTest[]>[
        {
            name: 'Speed Test',
            description: 'Basic generation speed',
            prompt: 'Count from 1 to 20.',
            maxTokens: 128,
            category: 'speed',
        },
        {
            name: 'Math Reasoning',
            description: 'Simple arithmetic',
            prompt: 'If John has 5 apples and buys 3 more, then gives 2 away, how many remain?',
            maxTokens: 256,
            category: 'reasoning',
        },
        {
            name: 'Logic',
            description: 'Simple deduction',
            prompt: 'All cats are animals. Fluffy is a cat. What can we conclude?',
            maxTokens: 256,
            category: 'reasoning',
        },
        {
            name: 'Creative Short',
            description: 'Short creative writing',
            prompt: 'Write a haiku about computers.',
            maxTokens: 64,
            category: 'creativity',
        },
    ],

    hard: <BenchmarkTest[]>[
        {
            name: 'Speed Stress',
            description: 'Sustained generation throughput',
            prompt: 'Count from 1 to 500, one number per line. Do not skip any.',
            maxTokens: 1024,
            category: 'speed',
        },
        {
            name: 'Heavy Math',
            description: 'Long chain-of-thought math',
            prompt:
                'John starts with 125 apples. Every day for 10 days he buys 37 apples, '
                + 'gives away 19, and loses 4. Show every single day step by step with running totals.',
            maxTokens: 1024,
            category: 'reasoning',
        },
        {
            name: 'Creative Load',
            description: 'Large creative output',
            prompt:
                'Write a detailed story about a robot learning to dance. '
                + 'Include dialogue, emotions, scene descriptions, and a plot twist.',
            maxTokens: 1500,
            category: 'creativity',
        },
        {
            name: 'Endurance',
            description: 'Maximum sustained generation',
            prompt:
                'Write a comprehensive guide to learning programming from scratch. '
                + 'Cover choosing a language, setting up tools, basic concepts, '
                + 'data structures, algorithms, projects, and career advice. Be thorough.',
            maxTokens: 2048,
            category: 'speed',
        },
    ],

    extreme: <BenchmarkTest[]>[
        {
            name: 'Sprint',
            description: 'Short burst peak speed',
            prompt: 'List the first 10 prime numbers.',
            maxTokens: 64,
            category: 'speed',
        },
        {
            name: 'Mid Range',
            description: 'Medium sustained generation',
            prompt:
                'Explain quantum computing in detail. Cover qubits, superposition, '
                + 'entanglement, quantum gates, and real-world applications.',
            maxTokens: 1024,
            category: 'reasoning',
        },
        {
            name: 'Long Haul',
            description: 'Extended generation under load',
            prompt:
                'Write a complete short story with three acts, multiple characters, '
                + 'dialogue, conflict, and resolution. Make it as long and detailed as possible.',
            maxTokens: 2048,
            category: 'creativity',
        },
        {
            name: 'GPU Killer',
            description: 'Maximum context stress test',
            prompt:
                'Write an extremely detailed technical tutorial about building a full-stack '
                + 'web application. Cover frontend (React), backend (Node.js), database (PostgreSQL), '
                + 'authentication, deployment, testing, CI/CD, monitoring, and scaling. '
                + 'Include code examples for every section. Be as thorough as possible.',
            maxTokens: 3500,
            category: 'speed',
        },
    ],
};