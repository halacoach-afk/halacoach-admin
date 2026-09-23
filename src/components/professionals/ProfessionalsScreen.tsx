'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {isApiError, listProfessionals, type ProfessionalSummary} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {completionPercent, formatCoachYearsExperience, verificationLabels} from '@/lib/professional-utils';

type Filter = 'all' | 'onboarded' | 'incomplete' | 'suspended';

function contactCell(value: string, verified: boolean) {
  const display = value.trim();
  if (!display) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div>
      <div className="text-sm text-foreground">{display}</div>
      {!verified ? (
        <div className="text-xs text-muted-foreground">(unverified)</div>
      ) : null}
    </div>
  );
}

function verificationTone(status: ProfessionalSummary['verificationStatus']) {
  if (status === 'verified') return 'primary' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'muted' as const;
}

export function ProfessionalsScreen() {
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
      if (filter === 'incomplete' && row.onboarded) {
        return false;
      }
      if (filter === 'suspended' && !row.suspended) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.id.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.specialty.toLowerCase().includes(q) ||
        row.about.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      onboarded: rows.filter(row => row.onboarded).length,
      incomplete: rows.filter(row => !row.onboarded).length,
      suspended: rows.filter(row => row.suspended).length,
    }),
    [rows],
  );

  if (loading) {
    return <LoadingState label="Loading professionals..." />;
  }

  if (error) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title="Professionals"
        description="Browse and manage coach accounts."
      />

      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['onboarded', 'Onboarded'],
            ['incomplete', 'Incomplete'],
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
          placeholder="Search id, name, email, phone..."
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
          tableClassName="min-w-[1100px]"
          columns={[
            'ID',
            'Name',
            'Email',
            'Number',
            'Experience',
            'About',
            'Verification',
            'Credits',
            'Profile',
            '',
          ]}>
          {visible.map(row => {
            const pct = completionPercent(row.profileCompletion);
            const about = row.about?.trim() || '';
            return (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                  {row.id}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                <td className="px-4 py-3">
                  {contactCell(row.email, Boolean(row.emailVerified))}
                </td>
                <td className="px-4 py-3">
                  {contactCell(row.phone, Boolean(row.phoneVerified))}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatCoachYearsExperience(row.years)}
                </td>
                <td className="max-w-[240px] px-4 py-3 text-sm text-muted-foreground">
                  <div className="line-clamp-2 break-words">
                    {about || '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={verificationTone(row.verificationStatus)}>
                    {verificationLabels[row.verificationStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                  {row.credits}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
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
            );
          })}
        </DataTable>
      )}
    </>
  );
}
