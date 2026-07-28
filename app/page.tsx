import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Health<span className="fy-highlight">ify</span></p>
          <h1>Your Personalized Wellness Assessment</h1>
          <p className="subtitle">
            Complete a quick, guided questionnaire to evaluate your stress, recovery, sleep, lifestyle, and overall wellbeing. Receive personalized recommendations based on your responses.
          </p>
          <Link href="/survey" className="primary-button">
            Start
          </Link>
        </div>
      </section>
    </main>
  );
}
