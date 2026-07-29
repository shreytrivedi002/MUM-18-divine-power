import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <main className="page-shell">
      <LoadingSpinner message="Loading page..." fullScreen />
    </main>
  );
}
