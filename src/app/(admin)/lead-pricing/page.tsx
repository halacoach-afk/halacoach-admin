import {LeadPricingScreen} from '@/components/lead-pricing/LeadPricingScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function LeadPricingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <LeadPricingScreen actor={user} />;
}
