import {FoundingMembersScreen} from '@/components/founding-members/FoundingMembersScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function FoundingMembersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <FoundingMembersScreen actor={user} />;
}
