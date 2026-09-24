import {SupportScreen} from '@/components/support/SupportScreen';
import {getCurrentUser} from '@/lib/current-user';
import {redirect} from 'next/navigation';

type Props = {
  searchParams: Promise<{ticket?: string}>;
};

export default async function SupportPage({searchParams}: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const params = await searchParams;
  const raw = params.ticket?.trim();
  const parsed = raw ? Number(raw) : NaN;
  const initialTicketId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  return <SupportScreen actor={user} initialTicketId={initialTicketId} />;
}
