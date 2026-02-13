import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LiteEdgeAI — Hardware AI Benchmark",
    template: "%s | LiteEdgeAI",
  },
  description:
    "Benchmark and rank your hardware for AI performance using WebGPU. Run real AI models directly in your browser.",
  metadataBase: new URL("https://liteedgeai.com"),
  openGraph: {
    type: "website",
    siteName: "LiteEdgeAI",
    title: "LiteEdgeAI — Hardware AI Benchmark",
    description:
      "Benchmark and rank your hardware for AI performance using WebGPU.",
    url: "https://liteedgeai.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "LiteEdgeAI — Hardware AI Benchmark",
    description:
      "Benchmark and rank your hardware for AI performance using WebGPU.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Global WebSite + Organization Schema */}
        <Script
          id="liteedgeai-global-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://liteedgeai.com/#website",
                  "url": "https://liteedgeai.com/",
                  "name": "LiteEdgeAI",
                  "description":
                    "Hardware AI benchmarking platform using WebGPU to run real AI models in the browser.",
                  "publisher": {
                    "@id": "https://liteedgeai.com/#organization",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://liteedgeai.com/#organization",
                  "name": "LiteEdgeAI",
                  "url": "https://liteedgeai.com/",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://liteedgeai.com/logo.png",
                  },
                },
              ],
            }),
          }}
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}