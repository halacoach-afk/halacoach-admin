import {CmsGuideEditScreen} from '@/components/cms/CmsGuideEditScreen';
import {getCurrentUser} from '@/lib/current-user';
import {notFound, redirect} from 'next/navigation';

type PageProps = {
  params: Promise<{id: string}>;
};

export default async function CmsGuidePage({params}: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const {id: raw} = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }
  return <CmsGuideEditScreen actor={user} id={id} />;
}
