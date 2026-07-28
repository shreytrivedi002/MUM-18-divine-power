import AdminChangePasswordForm from '../../../../components/admin/AdminChangePasswordForm';

export default function AdminChangePasswordPage() {
  return (
    <main className="page-shell survey-shell">
      <section className="admin-card">
        <div className="admin-toolbar">
          <div>
            <p className="eyebrow">Admin Portal</p>
            <h1>Change Password</h1>
            <p className="subtitle">Update your password from within the portal.</p>
          </div>
        </div>
        <AdminChangePasswordForm />
      </section>
    </main>
  );
}
