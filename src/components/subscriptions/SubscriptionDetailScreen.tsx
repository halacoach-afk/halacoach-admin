'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {ArrowLeft, ExternalLink} from 'lucide-react';
import {isApiError, type SessionUser} from '@/api';
import type {CreditSubscriptionDetail} from '@/api/types';
import {getCreditSubscription} from '@/lib/apis';
import {Badge} from '@/components/ui/Badge';
import {Card} from '@/components/ui/Card';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatAed} from '@/lib/credit-utils';

function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Field({label, value}: {label: string; value: ReactNode}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function statusTone(status: string): 'sky' | 'warning' | 'muted' | 'danger' {
  switch (status) {
    case 'active':
      return 'sky';
    case 'past_due':
      return 'warning';
    case 'canceled':
      return 'muted';
    case 'expired':
      return 'danger';
    default:
      return 'muted';
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function SubscriptionDetailScreen({
  actor: _actor,
  id,
}: {
  actor: SessionUser;
  id: string;
}) {
  const [sub, setSub] = useState<CreditSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSub(await getCreditSubscription(id));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load subscription.');
      setSub(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading subscription..." />;
  }

  if (error || !sub) {
    return <ErrorState body={error ?? 'Subscription not found.'} onRetry={() => void load()} />;
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to subscriptions
        </Link>
      </div>

      <PageHeader
        title={sub.package?.name ?? `Subscription #${sub.id}`}
        description={`${sub.professionalName} - ${sub.professionalEmail ?? sub.professionalId}`}
        actions={<Badge tone={statusTone(sub.status)}>{sub.status}</Badge>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {sub.cancelAtPeriodEnd ? <Badge tone="warning">Cancels at period end</Badge> : null}
        {sub.package?.type ? <Badge tone="muted">{sub.package.type}</Badge> : null}
        {sub.package?.badge ? <Badge tone="coral">{sub.package.badge}</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Coach">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={sub.professionalName} />
            <Field label="Email" value={sub.professionalEmail ?? '-'} />
            <Field
              label="Professional"
              value={
                <Link
                  href={`/professionals/${sub.professionalId}`}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Open profile
                  <ExternalLink size={14} />
                </Link>
              }
            />
            <Field label="User id" value={sub.userId} />
          </dl>
        </Section>

        <Section title="Plan">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Package" value={sub.package?.name ?? '-'} />
            <Field label="Credits / period" value={sub.package ? sub.package.credits : '-'} />
            <Field label="Price" value={sub.package ? formatAed(sub.package.price) : '-'} />
            <Field label="Package id" value={sub.packageId} />
          </dl>
        </Section>

        <Section title="Usage this period">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Wallet balance" value={sub.walletBalance} />
            <Field label="Granted this period" value={sub.periodGrantedCredits} />
            <Field label="Spent this period" value={sub.periodSpentCredits} />
            <Field label="Remaining (grant - spend)" value={sub.periodRemainingCredits} />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Remaining is period grant minus wallet spends in this period. Wallet balance can
            include one-time packs and leftover credits.
          </p>
        </Section>

        <Section title="Billing window">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Started" value={formatDate(sub.startedAt)} />
            <Field label="Period start" value={formatDate(sub.currentPeriodStart)} />
            <Field label="Period end" value={formatDate(sub.currentPeriodEnd)} />
            <Field label="Next grant" value={formatDate(sub.nextGrantAt)} />
            <Field label="Canceled at" value={formatDate(sub.canceledAt)} />
            <Field label="Cancel at period end" value={sub.cancelAtPeriodEnd ? 'Yes' : 'No'} />
          </dl>
        </Section>

        <Section title="Provider">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider" value={sub.provider ?? '-'} />
            <Field label="Provider subscription id" value={sub.providerSubscriptionId ?? '-'} />
            <Field label="Subscription id" value={sub.id} />
            <Field label="Status" value={sub.status} />
          </dl>
        </Section>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Membership grants
        </h2>
        {sub.grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grant transactions for this subscription.</p>
        ) : (
          <DataTable columns={['When', 'Credits', 'Label']} columnWidths={['30%', '20%', '50%']}>
            {sub.grants.map(txn => (
              <tr key={txn.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(txn.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">+{txn.credits}</td>
                <td className="px-4 py-3 text-sm text-foreground">{txn.label}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Spends this period
        </h2>
        {sub.periodSpends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spends in the current billing period.</p>
        ) : (
          <DataTable columns={['When', 'Credits', 'Label']} columnWidths={['30%', '20%', '50%']}>
            {sub.periodSpends.map(txn => (
              <tr key={txn.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(txn.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">-{txn.credits}</td>
                <td className="px-4 py-3 text-sm text-foreground">{txn.label}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
