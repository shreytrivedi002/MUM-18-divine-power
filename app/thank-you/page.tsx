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
          <div className="thank-you-details">
            <h2>DPHT Benefits</h2>
            <ul>
              <li>No Gym</li>
              <li>No Medicine</li>
              <li>Just Follow DPHT Therapy</li>
              <li>Do It Yourself (DIY) Easily</li>
              <li>Daily Reporting</li>
              <li>WhatsApp Support</li>
              <li>Result Oriented</li>
            </ul>
            <h2>DIVINE POWER HOLISTIC THERAPY (DPHT)</h2>
            <ul>
              <li>Enhances your energy level through Energy Therapy.</li>
              <li>Eliminates environmental toxins from inside and surrounding through Environment Therapy.</li>
              <li>Connects with nature for lifelong wellness through Earth Therapy.</li>
            </ul>
            <p>For overall health and happiness in life.</p>
          </div>
          <Link href="/" className="primary-button">
            Back to Home
          </Link>
        </div>
      </section>

      <section>
        <p className="subtitle">
          Reversal of your symptoms depends on the duration of suffering from symptoms.
        </p>
        <h2>Duration of Suffering</h2>
        <ul>
          <li>1 to 4 years: 4 Weeks Plan</li>
          <li>More than 4 to 8 years: 12 Weeks Plan</li>
          <li>More than 8 to 12 years: 25 Weeks Plan</li>
          <li>More than 12 years onwards: 52 Weeks Plan</li>
        </ul>
        <PlansShowcase />
      </section>
    </main>
  );
}
