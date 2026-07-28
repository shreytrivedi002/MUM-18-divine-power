import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">DIVINE POWER HOLISTIC THERAPY (DPHT)</p>
          <h1>Healthcare Without Medicine</h1>
          <p className="subtitle">
            Complete a guided holistic questionnaire to assess your lifestyle, stress, sleep, and wellbeing naturally through the DPHT approach.
          </p>
          <Link href="/survey" className="primary-button">
            Start
          </Link>
        </div>
      </section>
    </main>
  );
}
