'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {
  getDashboardOverview,
  getHealth,
  isApiError,
  type DashboardOverview,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatAed} from '@/lib/credit-utils';
import {
  dashboardActivityLabels,
  formatDashboardTime,
} from '@/lib/dashboard-utils';
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
      label: 'Credits sold',
      value: formatAed(counts.creditsSoldAed),
      hint: 'Completed checkout total',
      href: '/credits',
      permission: 'credits:read',
    },
    {
      label: 'Open support',
      value: String(counts.openSupportTickets),
      hint: 'New or replied tickets',
      href: '/support',
      permission: 'support:read',
    },
  ];
}

const activityPermission: Record<DashboardOverview['recentActivity'][number]['kind'], Permission> = {
  client_signup: 'clients:read',
  pro_signup: 'professionals:read',
  verification_pending: 'verification:read',
  lead_unlock: 'leads:read',
  credit_purchase: 'credits:read',
  support_ticket: 'support:read',
};

export function DashboardScreen({actor}: {actor: SessionUser}) {
  const pathname = usePathname();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [apiSource, setApiSource] = useState<'api' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, health] = await Promise.all([getDashboardOverview(), getHealth()]);
      setOverview(dashboard);
      setApiSource(health.source);
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
    [overview, actor.role],
  );

  const activity = useMemo(() => {
    if (!overview) {
      return [];
    }
    return overview.recentActivity.filter(item => can(actor, activityPermission[item.kind]));
  }, [overview, actor.role]);

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
        description="Counts refresh when you return here — approve coaches on Verification and the pending count drops automatically."
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="primary">API {apiSource ?? '...'}</Badge>
        <span className="text-sm text-muted-foreground">
          Live counts from the API across verification, leads, credits, and support.
        </span>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {statCards.map(card => (
          <Link key={card.label} href={card.href}>
            <Card className="h-full transition hover:border-primary">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
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

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
            <p className="text-sm text-muted-foreground">
              Latest signups, verifications, unlocks, purchases, and support messages.
            </p>
          </div>
        </div>

        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity visible for your role.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map(item => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="sky">{dashboardActivityLabels[item.kind]}</Badge>
                    <p className="font-medium text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{formatDashboardTime(item.at)}</span>
                  <Link href={item.href} className="font-semibold text-primary hover:underline">
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
