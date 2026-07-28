import { redirect } from 'next/navigation';
import AdminLoginForm from '../../../components/admin/AdminLoginForm';
import { getAuthenticatedAdminFromCookies } from '../../../lib/adminAuth';

export default async function AdminLoginPage() {
  const admin = await getAuthenticatedAdminFromCookies();
  if (admin) {
    redirect('/admin');
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Admin Portal</p>
          <h1>Admin Sign-In</h1>
          <p className="subtitle">Sign in to manage users, questionnaires, and response history.</p>
        </div>
        <div>
          <div className="admin-card">
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
