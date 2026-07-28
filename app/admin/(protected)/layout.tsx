import { redirect } from 'next/navigation';
import { getAuthenticatedAdminFromCookies } from '../../../lib/adminAuth';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAuthenticatedAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  return <>{children}</>;
}
