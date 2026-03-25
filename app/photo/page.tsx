'use client';
import dynamic from 'next/dynamic';

const PhotoPage = dynamic(() => import('./PhotoPage'), { ssr: false });

export default function Page() {
    return <PhotoPage />;
}
