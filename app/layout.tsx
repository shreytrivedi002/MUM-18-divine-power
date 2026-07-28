import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DIVINE POWER HOLISTIC THERAPY (DPHT) - Healthcare Without Medicine',
  description: 'Holistic wellness questionnaire by DPHT for healthcare without medicine, with secure response handling.',
  metadataBase: new URL('https://healthi-fi.example.com'),
  openGraph: {
    title: 'DIVINE POWER HOLISTIC THERAPY (DPHT)',
    description: 'Healthcare without medicine through a guided holistic wellness questionnaire.',
    type: 'website',
    url: 'https://healthi-fi.example.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DIVINE POWER HOLISTIC THERAPY (DPHT)',
    description: 'Healthcare without medicine with a mobile-friendly holistic wellness questionnaire.',
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
