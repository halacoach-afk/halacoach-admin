import {LeadsScreen} from '@/components/leads/LeadsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <LeadsScreen />;
}
