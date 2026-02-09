'use client';

import Navbar from '../components/navbar';
import { SubmitResultsPage } from './components/results';

export default function BenchmarkPage() {
    return <>
        <Navbar />
        <SubmitResultsPage onSubmit={() => { }} onSkip={() => { }} />

    </>;
}
