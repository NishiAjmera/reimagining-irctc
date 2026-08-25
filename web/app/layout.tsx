import type { Metadata } from 'next';
import { Geist, Newsreader } from 'next/font/google';
import './globals.css';

const sans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const serif = Newsreader({ variable: '--font-serif', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RailEase — Journeys that actually work for you',
  description: 'A calm, explainable railway journey planner built for confident choices.',
  openGraph: {
    title: 'RailEase — Journeys that actually work for you',
    description: 'A calm, explainable railway journey planner built for confident choices.',
    type: 'website',
    images: [{ url: 'https://railease-journey-planner.nishiajmera21.chatgpt.site/og.png', width: 1200, height: 630, alt: 'RailEase — Journeys that actually work for you.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RailEase — Journeys that actually work for you',
    description: 'A calm, explainable railway journey planner built for confident choices.',
    images: ['https://railease-journey-planner.nishiajmera21.chatgpt.site/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
