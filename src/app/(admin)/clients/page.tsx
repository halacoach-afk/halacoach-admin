import {ClientsScreen} from '@/components/clients/ClientsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <ClientsScreen />;
}
