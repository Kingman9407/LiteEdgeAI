'use client';

import WebLLMBenchmark from './components/WebLLMBenchmark';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import CreditsCTA from './components/benchcredits';

export default function BenchmarkPage() {
    return <>
        <Navbar />
        <WebLLMBenchmark />
        <CreditsCTA />
        <Footer />
    </>;
}
