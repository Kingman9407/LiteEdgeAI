
import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "../components/navbar";
import RankingsPage from "./components/ranking1";
import Footer from "../components/footer";

export const metadata: Metadata = {
    title: "GPU Rankings & Benchmarks",
    description:
        "Live GPU rankings across all devices. Compare AI and compute performance using real benchmark data.",
    alternates: {
        canonical: "/ranking",
    },
    openGraph: {
        title: "GPU Rankings & Benchmarks | LiteEdgeAI",
        description:
            "Compare GPU performance across devices with real-world AI benchmarks.",
        url: "https://liteedgeai.com/ranking",
        type: "website",
        images: ["/og-image.png"],
    },
    twitter: {
        card: "summary_large_image",
        title: "GPU Rankings & Benchmarks | LiteEdgeAI",
        description:
            "Live GPU rankings and AI benchmark results across all devices.",
        images: ["/og-image.png"],
    },
};

export default function Home() {
    return (
        <main>
            {/* GPU Rankings Schema */}
            <Script
                id="gpu-rankings-schema"
                type="application/ld+json"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "ItemList",
                        "@id": "https://liteedgeai.com/rankings#leaderboard",
                        "name": "GPU Performance Rankings",
                        "description":
                            "Leaderboard ranking GPUs across devices based on AI and compute benchmarks.",
                        "itemListOrder": "Descending",
                        "isPartOf": {
                            "@id": "https://liteedgeai.com/#website"
                        },
                        "about": {
                            "@id": "https://liteedgeai.com/#organization"
                        },
                        "url": "https://liteedgeai.com/rankings"
                    }),
                }}
            />

            <Navbar />
            <RankingsPage />
            <Footer />
        </main>
    );
}