import type { Metadata } from 'next';
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import HowItWorks from "./components/work";

export const metadata: Metadata = {
    title: 'How It Works — LiteEdgeAI',
    description: 'Learn about the methodology and technical details behind LiteEdgeAI benchmarks.',
    alternates: {
        canonical: '/working',
    },
    openGraph: {
        title: 'How It Works — LiteEdgeAI',
        description: 'Learn about the methodology and technical details behind LiteEdgeAI benchmarks.',
        url: 'https://liteedgeai.com/working',
        type: 'website',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How It Works — LiteEdgeAI',
        description: 'Learn about the methodology and technical details behind LiteEdgeAI benchmarks.',
        images: ['/og-image.png'],
    },
};
export default function WorkingPage() {
    return (
        <main>
            <Navbar />
            <HowItWorks />
            <Footer />

        </main>
    );
}