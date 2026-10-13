'use client';

import {ActivityLogsTable, type ActivityLogsTableScope} from '@/components/activity/ActivityLogsTable';

type Props = {
  scope: ActivityLogsTableScope;
  title?: string;
  compact?: boolean;
};

export function ActivityTimeline({
  scope,
  title = 'Activity',
  compact = false,
}: Props) {
  return (
    <section className="min-w-0">
      {title ? (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <ActivityLogsTable scope={scope} compactFilters={compact || scope.kind !== 'global'} />
    </section>
  );
}
