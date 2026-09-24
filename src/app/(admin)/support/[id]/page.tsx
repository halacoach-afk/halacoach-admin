import {redirect} from 'next/navigation';

type Props = {
  params: Promise<{id: string}>;
};

/** Deep links (e.g. dashboard) open the inbox modal via ?ticket= */
export default async function SupportDetailPage({params}: Props) {
  const {id} = await params;
  redirect(`/support?ticket=${encodeURIComponent(id)}`);
}
