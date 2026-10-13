'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {
  getDashboardOverview,
  isApiError,
  type DashboardOverview,
  type SessionUser,
} from '@/api';
import {ActivityLogsTable} from '@/components/activity/ActivityLogsTable';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can, type Permission} from '@/lib/permissions';

type StatCard = {
  label: string;
  value: string;
  hint?: string;
  href: string;
  permission: Permission;
};

function buildStatCards(overview: DashboardOverview): StatCard[] {
  const {counts} = overview;
  return [
    {
      label: 'Pending verification',
      value: String(counts.pendingVerifications),
      hint: 'Coaches waiting for document review',
      href: '/verification',
      permission: 'verification:read',
    },
    {
      label: 'Open leads',
      value: String(counts.openLeads),
      hint: 'Active marketplace requests',
      href: '/leads',
      permission: 'leads:read',
    },
    {
      label: 'Unlocks today',
      value: String(counts.unlocksToday),
      hint: 'Lead contacts opened today',
      href: '/leads',
      permission: 'leads:read',
    },
    {
      label: 'Clients',
      value: String(counts.clients),
      hint: `${counts.newClientsWeek} new this week`,
      href: '/clients',
      permission: 'clients:read',
    },
    {
      label: 'Professionals',
      value: String(counts.professionals),
      hint: `${counts.newProsWeek} new this week`,
      href: '/professionals',
      permission: 'professionals:read',
    },
    {
      label: 'Open support',
      value: String(counts.openSupportTickets),
      hint: 'Open or in-progress tickets',
      href: '/support',
      permission: 'support:read',
    },
  ];
}

export function DashboardScreen({actor}: {actor: SessionUser}) {
  const pathname = usePathname();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canReadActivity = can(actor, 'activity:read');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getDashboardOverview();
      setOverview(dashboard);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pathname === '/') {
      void load();
    }
  }, [pathname]);

  const statCards = useMemo(
    () => (overview ? buildStatCards(overview).filter(card => can(actor, card.permission)) : []),
    [overview, actor],
  );

  if (loading && !overview) {
    return <LoadingState label="Loading dashboard..." />;
  }

  if (error && !overview) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  if (!overview) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState body={error} onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {statCards.map(card => (
          <Link key={card.label} href={card.href}>
            <Card className="h-full transition hover:border-primary">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </p>
                  {card.hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                  ) : null}
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <section className="min-w-0">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
        </div>

        {!canReadActivity ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              Activity history requires the activity:read permission.
            </p>
          </Card>
        ) : (
          <ActivityLogsTable scope={{kind: 'global'}} />
        )}
      </section>
    </>
  );
}
