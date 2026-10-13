import {ActivityLogsScreen} from '@/components/activity/ActivityLogsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <ActivityLogsScreen />;
}
