'use client';

import {useState} from 'react';
import type {SessionUser} from '@/api';
import {TransactionsScreen} from '@/components/billing/TransactionsScreen';
import {SubscriptionsScreen} from '@/components/subscriptions/SubscriptionsScreen';
import {Button} from '@/components/ui/Button';
import {PageHeader} from '@/components/ui/PageHeader';

export function BillingScreen({actor}: {actor: SessionUser}) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PageHeader
        title="Billing & Invoices"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(key => key + 1)}>
            Refresh
          </Button>
        }
      />

      <section className="mb-10">
        <SubscriptionsScreen actor={actor} embedded refreshKey={refreshKey} />
      </section>

      <section>
        <TransactionsScreen embedded refreshKey={refreshKey} />
      </section>
    </>
  );
}
