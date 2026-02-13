import Script from "next/script";
import Navbar from './components/navbar';
import HomePage from './components/hero1';
import Footer from './components/footer';
import HowItWorks from './components/hero2';
import WhyItMatters from './components/hero3';
import JoinCommunity from './components/hero4';

export default function Home() {
  return (
    <main>
      {/* Home Page Schema */}
      <Script
        id="homepage-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": "https://liteedgeai.com/#home",
            "url": "https://liteedgeai.com/",
            "name": "LiteEdgeAI — Hardware AI Benchmark",
            "description":
              "Benchmark and rank your hardware for AI performance using WebGPU. Run real AI models directly in your browser.",
            "isPartOf": {
              "@id": "https://liteedgeai.com/#website"
            },
            "about": {
              "@id": "https://liteedgeai.com/#organization"
            },
            "primaryImageOfPage": {
              "@type": "ImageObject",
              "url": "https://liteedgeai.com/og-image.png"
            }
          })
        }}
      />

      <Navbar />
      <HomePage />
      <HowItWorks />
      <WhyItMatters />
      <JoinCommunity />
      <Footer />
    </main>
  );
}