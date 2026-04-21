import type { Metadata } from 'next';
import ChatInterface from './components/ChatInterface';
import Navbar from '../components/navbar';

export const metadata: Metadata = {
    title: 'Chat',
    description: 'Chat with a local AI model running entirely in your browser using WebGPU — no data leaves your device.',
    alternates: { canonical: '/chat' },
};

export default function ChatPage() {
    return (
        <>
            <Navbar />
            <ChatInterface />
        </>
    );
}
