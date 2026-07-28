import AdminUserProfileClient from '../../../../../components/admin/AdminUserProfileClient';

export default function AdminUserPage({ params }: { params: { userId: string } }) {
  return (
    <main className="page-shell survey-shell">
      <AdminUserProfileClient userId={params.userId} />
    </main>
  );
}
