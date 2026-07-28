import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HealthiFi - Cortisol Detox Questionnaire',
  description: 'Mobile-first wellness questionnaire designed for cortisol detox guidance, with secure response handling.',
  metadataBase: new URL('https://healthi-fi.example.com'),
  openGraph: {
    title: 'HealthiFi Cortisol Detox',
    description: 'Complete a fast and mobile-first cortisol detox questionnaire with secure response handling.',
    type: 'website',
    url: 'https://healthi-fi.example.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HealthiFi Cortisol Detox',
    description: 'Mobile-friendly wellness questionnaire for cortisol detox built on Next.js.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
