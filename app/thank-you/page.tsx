import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">DIVINE POWER HOLISTIC THERAPY (DPHT)</p>
          <h1>Thank You</h1>
          <p className="subtitle">
            Your response has been submitted successfully. Our team will reach out to you soon.
          </p>
          <Link href="/" className="primary-button">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
