import {AdminDetailScreen} from '@/components/admins/AdminDetailScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

type Props = {
  params: Promise<{id: string}>;
};

export default async function AdminDetailPage({params}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const {id} = await params;
  return <AdminDetailScreen actor={user} id={id} />;
}
