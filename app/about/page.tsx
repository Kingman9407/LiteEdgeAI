import type { Metadata } from 'next';
import Navbar from '../components/navbar';
import About1 from './components/about1';
import Footer from '../components/footer';

export const metadata: Metadata = {
    title: 'About — LiteEdgeAI',
    description: 'Learn about LiteEdgeAI, the hardware AI benchmarking platform.',
    alternates: {
        canonical: '/about',
    },
    openGraph: {
        title: 'About — LiteEdgeAI',
        description: 'Learn about LiteEdgeAI, the hardware AI benchmarking platform.',
        url: 'https://liteedgeai.com/about',
        type: 'website',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About — LiteEdgeAI',
        description: 'Learn about LiteEdgeAI, the hardware AI benchmarking platform.',
        images: ['/og-image.png'],
    },
};


export default function AboutPage() {
    return (
        <main>
            <Navbar />
            <About1 />
            <Footer />
        </main>
    );
}