'use client';

import Navbar from '../../components/navbar';
import { SubmitResultsPage } from './components/results';

export default function ResultsPage() {
    return <>
        <Navbar />
        <SubmitResultsPage onSubmit={() => { }} onSkip={() => { }} />

    </>;
}
