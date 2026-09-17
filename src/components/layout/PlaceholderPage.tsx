import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Coming in a later module"
        body="This screen is wired in the shell so we can work step by step. Data and actions land when that module is built."
      />
    </>
  );
}
