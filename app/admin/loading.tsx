import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <main className="page-shell survey-shell">
      <LoadingSpinner message="Loading admin portal..." fullScreen />
    </main>
  );
}
