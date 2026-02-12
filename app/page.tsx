'use client';

import BenchmarkPage from './benchmark/page';
import Navbar from './components/navbar';
import HomePage from './components/hero1';
import Footer from './components/footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <HomePage />
      <Footer />
    </main>
  );
}
