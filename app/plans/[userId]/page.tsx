import PlanSelection from '../../../components/PlanSelection';

export default function PlansPage({ params }: { params: { userId: string } }) {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">DIVINE POWER HOLISTIC THERAPY (DPHT)</p>
          <h1>Thank You</h1>
          <p className="subtitle">
            Your DPHT response has been submitted successfully. Your determination creates your reality, and every small achievement matters.
          </p>
        </div>
      </section>

      <PlanSelection userId={params.userId} />
    </main>
  );
}
