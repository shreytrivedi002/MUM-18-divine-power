import Link from 'next/link';
import PlansShowcase from '../../components/PlansShowcase';

export default function ThankYouPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">DIVINE POWER HOLISTIC THERAPY (DPHT)</p>
          <h1>Thank You</h1>
          <p className="subtitle">
            Your DPHT response has been submitted successfully. Your determination creates your reality, and every small achievement matters.
          </p>
          <Link href="/" className="primary-button">
            Back to Home
          </Link>
        </div>
      </section>

      <section>
        <p className="subtitle">
          Based on your answers, your plan is ready. Predicted visible improvement generally appears in 30 days with regular follow-through.
        </p>
        <div className="progress-chart" aria-label="Health improvement projection chart">
          <div className="progress-chart-line" />
          <div className="progress-chart-point">
            <strong>Today</strong>
            <span>Start</span>
          </div>
          <div className="progress-chart-point">
            <strong>Week 4</strong>
            <span>Visible Improvement</span>
          </div>
          <div className="progress-chart-point">
            <strong>Week 12</strong>
            <span>Consistency</span>
          </div>
          <div className="progress-chart-point">
            <strong>Week 25+</strong>
            <span>Symptom Reversal Path</span>
          </div>
        </div>
        <PlansShowcase />
      </section>
    </main>
  );
}
