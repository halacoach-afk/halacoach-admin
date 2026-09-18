import {SubscriptionDetailScreen} from '@/components/subscriptions/SubscriptionDetailScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

type Props = {
  params: Promise<{id: string}>;
};

export default async function SubscriptionDetailPage({params}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const {id} = await params;
  return <SubscriptionDetailScreen actor={user} id={id} />;
}
