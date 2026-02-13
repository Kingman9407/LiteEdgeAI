'use client';

import BenchmarkPage from './benchmark/page';
import Navbar from './components/navbar';
import HomePage from './components/hero1';
import Footer from './components/footer';
import HowItWorks from './components/hero2';
import WhyItMatters from './components/hero3';
import JoinCommunity from './components/hero4';

export default function Home() {
  return (
    <main>
      <Navbar />
      <HomePage />
      <HowItWorks />
      <WhyItMatters />
      <JoinCommunity />
      <Footer />
    </main>
  );
}
