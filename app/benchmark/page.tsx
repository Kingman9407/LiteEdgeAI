'use client';

import WebLLMBenchmark from './components/WebLLMBenchmark';
import Navbar from '../components/navbar';
import Footer from '../components/footer';

export default function BenchmarkPage() {
    return <>
        <Navbar />
        <WebLLMBenchmark />
        <Footer />
    </>;
}
