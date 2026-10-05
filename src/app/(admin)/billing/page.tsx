import {BillingScreen} from '@/components/billing/BillingScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <BillingScreen actor={user} />;
}
