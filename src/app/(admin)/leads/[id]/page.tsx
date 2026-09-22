import {LeadDetailScreen} from '@/components/leads/LeadDetailScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

type Props = {
  params: Promise<{id: string}>;
};

export default async function LeadDetailPage({params}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const {id} = await params;
  return <LeadDetailScreen id={id} />;
}
