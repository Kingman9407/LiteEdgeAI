import { redirect } from 'next/navigation';

/**
 * /benchmark/results is not a standalone destination.
 * The submit flow is rendered inline inside WebLLMBenchmark
 * after a benchmark run completes. Redirect direct navigations
 * back to the benchmark page.
 */
export default function ResultsPage() {
    redirect('/benchmark');
}
