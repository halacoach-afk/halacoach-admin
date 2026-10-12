import {ProfessionalsScreen} from '@/components/professionals/ProfessionalsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function ProfessionalsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <ProfessionalsScreen actor={user} />;
}
