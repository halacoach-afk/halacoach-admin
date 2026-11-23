import {CmsScreen} from '@/components/cms/CmsScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function CmsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <CmsScreen actor={user} />;
}
