import {CmsGuideEditScreen} from '@/components/cms/CmsGuideEditScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

export default async function CmsNewGuidePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <CmsGuideEditScreen actor={user} id="new" />;
}
