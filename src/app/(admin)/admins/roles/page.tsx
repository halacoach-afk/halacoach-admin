import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function AdminRolesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  redirect('/admins');
}
