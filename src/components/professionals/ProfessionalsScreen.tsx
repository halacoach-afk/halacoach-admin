'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listProfessionals, type ProfessionalSummary, type SessionUser} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {verificationLabels} from '@/lib/professional-utils';

type Filter = 'all' | 'onboarded' | 'verified' | 'pending' | 'inactive' | 'suspended';

function verificationTone(status: ProfessionalSummary['verificationStatus']) {
  if (status === 'verified') {
    return 'primary' as const;
  }
  if (status === 'pending') {
    return 'warning' as const;
  }
  if (status === 'rejected') {
    return 'danger' as const;
  }
  return 'muted' as const;
}

export function ProfessionalsScreen({actor}: {actor: SessionUser}) {
  const [rows, setRows] = useState<ProfessionalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listProfessionals());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load professionals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      if (filter === 'onboarded' && !row.onboarded) {
        return false;
      }
      if (filter === 'verified' && row.verificationStatus !== 'verified') {
        return false;
      }
      if (filter === 'pending' && row.verificationStatus !== 'pending') {
        return false;
      }
      if (filter === 'inactive' && row.activated) {
        return false;
      }
      if (filter === 'suspended' && !row.suspended) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.specialty.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      onboarded: rows.filter(row => row.onboarded).length,
      verified: rows.filter(row => row.verificationStatus === 'verified').length,
      pending: rows.filter(row => row.verificationStatus === 'pending').length,
      inactive: rows.filter(row => !row.activated).length,
      suspended: rows.filter(row => row.suspended).length,
    }),
    [rows],
  );

  if (loading) {
    return <LoadingState label="Loading professionals…" />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        module="M4"
        title="Professionals"
        description="Coach profiles from mobile onboarding (services, location, pricing, docs). Reviewers can browse; super admins can edit and suspend."
      />

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['onboarded', 'Onboarded'],
            ['verified', 'Verified'],
            ['pending', 'Pending'],
            ['inactive', 'Not activated'],
            ['suspended', 'Suspended'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}>
            {label} ({counts[key]})
          </Button>
        ))}
        <input
          className="ms-auto h-9 min-w-[200px] rounded-xl border border-border px-3 text-sm"
          placeholder="Search name, email, location…"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      {visible.length === 0 ? (
        <EmptyState
          title="No professionals match"
          body="Try another filter or clear the search box."
        />
      ) : (
        <DataTable
          columns={[
            'Name',
            'Location',
            'Services',
            'Onboarded',
            'Verification',
            'Credits',
            'Activated',
            'Profile',
            '',
          ]}>
          {visible.map(row => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.specialty}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.location}</td>
              <td className="px-4 py-3">{row.serviceCount}</td>
              <td className="px-4 py-3">
                {row.onboarded ? (
                  <Badge tone="primary">Yes</Badge>
                ) : (
                  <Badge tone="muted">No</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={verificationTone(row.verificationStatus)}>
                  {verificationLabels[row.verificationStatus]}
                </Badge>
              </td>
              <td className="px-4 py-3 font-medium">{row.credits}</td>
              <td className="px-4 py-3">
                {row.suspended ? (
                  <Badge tone="danger">Suspended</Badge>
                ) : row.activated ? (
                  <Badge tone="primary">Live</Badge>
                ) : (
                  <Badge tone="muted">Off</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{width: `${row.profileCompletion}%`}}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{row.profileCompletion}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-end">
                <Link
                  href={`/professionals/${row.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  View
                  <ChevronRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Signed in as {actor.name} ({actor.role}). Verification approve/reject is in M5.
      </p>
    </>
  );
}
