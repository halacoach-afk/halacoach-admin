import {SettingsScreen} from '@/components/settings/SettingsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <SettingsScreen actor={user} />;
}
