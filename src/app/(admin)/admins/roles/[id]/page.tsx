import {AdminRoleDetailScreen} from '@/components/admins/AdminRoleDetailScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminRoleDetailPage({params}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const {id} = await params;
  return <AdminRoleDetailScreen actor={user} id={id} />;
}
