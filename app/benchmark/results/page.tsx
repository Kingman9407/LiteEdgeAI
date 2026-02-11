'use client';

import Navbar from '../../components/navbar';
import { SubmitResultsPage } from './components/results';

export default function ResultsPage() {
    return <>
        <Navbar />
        <SubmitResultsPage onSubmit={function (): void {
            throw new Error('Function not implemented.');
        }} onSkip={function (): void {
            throw new Error('Function not implemented.');
        }} benchmarkData={{
            normalizedGPU: undefined,
            performanceScore: undefined,
            performanceTier: undefined,
            graphicsBackend: undefined,
            gpuBrand: undefined,
            platformType: undefined
        }} systemSpecs={{
            cpuCores: 0,
            deviceMemory: undefined,
            os: '',
            screen: ''
        }} benchmarkResults={{
            modelName: undefined,
            tokensPerSecond: 0,
            loadTime: 0,
            benchmarks: []
        }} modelName={''} />

    </>;
}
