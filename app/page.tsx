'use client';

import BenchmarkPage from './benchmark/page';
import Navbar from './components/navbar';
import HomePage from './components/hero1';

export default function Home() {
  return (
    <main>
      <Navbar />
      <HomePage />
    </main>
  );
}
