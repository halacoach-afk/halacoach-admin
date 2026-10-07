'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';
import {isApiError, type SessionUser} from '@/api';
import type {CreditSubscriptionDetail} from '@/api/types';
import {getCreditSubscription} from '@/lib/apis';
import {Card} from '@/components/ui/Card';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
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
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

function statusLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
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
          href="/billing"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to billing
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="User">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="ID" value={sub.userId} />
            <Field
              label="Name"
              value={
                <Link
                  href={`/professionals/${sub.professionalId}`}
                  className="font-medium text-primary hover:underline">
                  {sub.professionalName}
                </Link>
              }
            />
            <Field
              label="Email"
              value={
                <span className="break-all">{sub.professionalEmail ?? '-'}</span>
              }
            />
            <Field label="Phone" value={sub.professionalPhone ?? '-'} />
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

        <Section title="Billing window">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Started" value={formatDate(sub.startedAt)} />
            <Field label="Period start" value={formatDate(sub.currentPeriodStart)} />
            <Field label="Period end" value={formatDate(sub.currentPeriodEnd)} />
            <Field label="Next grant" value={formatDate(sub.nextGrantAt)} />
            <Field label="Canceled at" value={formatDate(sub.canceledAt)} />
          </dl>
        </Section>

        <Section title="Provider">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider" value={sub.provider ?? '-'} />
            <Field label="Provider subscription id" value={sub.providerSubscriptionId ?? '-'} />
            <Field label="Subscription id" value={sub.id} />
            <Field label="Status" value={statusLabel(sub.status)} />
          </dl>
        </Section>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Subscription transactions
        </h2>
        {(sub.transactions ?? []).length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No membership grant transactions for this subscription.
            </p>
          </Card>
        ) : (
          <DataTable columns={['ID', 'When', 'Credits', 'Kind']}>
            {(sub.transactions ?? []).map(txn => (
              <tr key={txn.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                  {txn.id}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(txn.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-primary">
                  +{txn.credits}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {txn.kind
                    ? txn.kind.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
                    : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </>
  );
}
