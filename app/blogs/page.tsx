import React from 'react';
import type { Metadata } from 'next';
import Navbar from '../components/navbar';
import BlogHome from './components/bloghome';
import Footer from '../components/footer';

export const metadata: Metadata = {
    title: 'AI & Hardware Blog — LiteEdgeAI',
    description: 'Insights, experiments, and news about edge AI and hardware performance.',
    alternates: {
        canonical: '/blogs',
    },
    openGraph: {
        title: 'AI & Hardware Blog — LiteEdgeAI',
        description: 'Insights, experiments, and news about edge AI and hardware performance.',
        url: 'https://liteedgeai.com/blogs',
        type: 'website',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AI & Hardware Blog — LiteEdgeAI',
        description: 'Insights, experiments, and news about edge AI and hardware performance.',
        images: ['/og-image.png'],
    },
};

export default function blogs() {
    return (
        <main>
            <Navbar />

            <BlogHome />

            <Footer />

        </main>
    )
}