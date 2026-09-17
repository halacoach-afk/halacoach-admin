import {SubscriptionsScreen} from '@/components/subscriptions/SubscriptionsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <SubscriptionsScreen actor={user} />;
}
