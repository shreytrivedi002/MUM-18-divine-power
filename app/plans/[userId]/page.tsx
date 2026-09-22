import PlanSelection from '../../../components/PlanSelection';

export default function PlansPage({ params }: { params: { userId: string } }) {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">DIVINE POWER HOLISTIC THERAPY (DPHT)</p>
          <h1>DPHT Plan</h1>
          <p className="subtitle">
            Welcome, your DPHT plan is ready.
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
            <h2>Duration of Sufferings</h2>
            <p>Reversal of your symptoms depends on the duration of suffering from symptoms.</p>
            <ul>
              <li>1 to 4 years: 4 Weeks Plan</li>
              <li>More than 4 to 8 years: 12 Weeks Plan</li>
              <li>More than 8 to 12 years: 25 Weeks Plan</li>
              <li>More than 12 years onwards: 52 Weeks Plan</li>
            </ul>
          </div>
        </div>
      </section>

      <PlanSelection userId={params.userId} />
    </main>
  );
}
