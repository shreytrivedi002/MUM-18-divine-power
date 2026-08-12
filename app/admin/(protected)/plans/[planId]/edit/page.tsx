import AdminPlanEditorClient from '../../../../../../components/admin/AdminPlanEditorClient';

export default function AdminPlanEditPage({
  params,
}: {
  params: { planId: string };
}) {
  return (
    <main className="page-shell survey-shell">
      <AdminPlanEditorClient mode="edit" planId={params.planId} />
    </main>
  );
}
