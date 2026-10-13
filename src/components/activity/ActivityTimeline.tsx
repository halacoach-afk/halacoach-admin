'use client';

import {ActivityLogsTable, type ActivityLogsTableScope} from '@/components/activity/ActivityLogsTable';

type Props = {
  scope: ActivityLogsTableScope;
  title?: string;
  /**
   * When true, hide Entities column filters (page already pins the primary entity).
   * Defaults to compact filters for non-global scopes.
   */
  compact?: boolean;
};

export function ActivityTimeline({
  scope,
  title = 'Recent activity',
  compact,
}: Props) {
  const compactFilters =
    compact ?? (scope.kind !== 'global');

  return (
    <section className="min-w-0">
      {title ? (
        <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      ) : null}
      <ActivityLogsTable scope={scope} compactFilters={compactFilters} />
    </section>
  );
}
