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
          <div className="personalized-care">
            <h2>Our approach to personalized care</h2>
            <p>
              We tailor each treatment program to your personal history, current challenges, and future goals, making sure you have access to therapies that suit your individual strengths and preference.
            </p>
          </div>
          <Link href="/survey" className="primary-button">
            Start
          </Link>
        </div>
      </section>
    </main>
  );
}
