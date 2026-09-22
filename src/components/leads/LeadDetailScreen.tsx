'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleX,
  ClipboardList,
  Clock3,
  Dumbbell,
  Languages,
  Mail,
  MapPin,
  Phone,
  Radius,
  Repeat,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  getLead,
  isApiError,
  listServices,
  type CatalogService,
  type LeadDetail,
  type LeadLifecycleStatus,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {
  type LeadPreferenceDisplay,
  leadPreferenceDisplay,
} from '@/lib/lead-preference-labels';
import {formatPostedAt} from '@/lib/lead-utils';

function PrefField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

/** Two-column order matches product preference card (left/right pairs). */
const PREFERENCE_ROWS: Array<{
  key: keyof LeadPreferenceDisplay;
  label: string;
  icon: ReactNode;
}> = [
  {key: 'goal', label: 'Goal', icon: <Target className="size-3.5" strokeWidth={1.8} />},
  {key: 'format', label: 'Format', icon: <Sparkles className="size-3.5" strokeWidth={1.8} />},
  {key: 'frequency', label: 'Frequency', icon: <Repeat className="size-3.5" strokeWidth={1.8} />},
  {key: 'days', label: 'Days', icon: <CalendarDays className="size-3.5" strokeWidth={1.8} />},
  {key: 'times', label: 'Times', icon: <Clock3 className="size-3.5" strokeWidth={1.8} />},
  {key: 'start', label: 'Start', icon: <CalendarClock className="size-3.5" strokeWidth={1.8} />},
  {
    key: 'experience',
    label: 'Experience & activity',
    icon: <Dumbbell className="size-3.5" strokeWidth={1.8} />,
  },
  {
    key: 'coachGender',
    label: 'Coach gender',
    icon: <Users className="size-3.5" strokeWidth={1.8} />,
  },
  {
    key: 'coachStyle',
    label: 'Coach style',
    icon: <Sparkles className="size-3.5" strokeWidth={1.8} />,
  },
  {
    key: 'languages',
    label: 'Languages',
    icon: <Languages className="size-3.5" strokeWidth={1.8} />,
  },
  {key: 'location', label: 'Location', icon: <MapPin className="size-3.5" strokeWidth={1.8} />},
  {key: 'radius', label: 'Travel radius', icon: <Radius className="size-3.5" strokeWidth={1.8} />},
  {
    key: 'goalDetails',
    label: 'Goal details',
    icon: <ClipboardList className="size-3.5" strokeWidth={1.8} />,
  },
];

function lifecycleLabel(status: LeadLifecycleStatus | undefined, fallback: 'open' | 'closed') {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'open' || fallback === 'open') return 'Open';
  return 'Closed';
}

function lifecycleTone(
  status: LeadLifecycleStatus | undefined,
  fallback: 'open' | 'closed',
): 'primary' | 'muted' | 'warning' | 'danger' {
  if (status === 'in_progress') return 'warning';
  if (status === 'completed') return 'primary';
  if (status === 'cancelled' || fallback === 'closed') return 'danger';
  return 'primary';
}

function StatusIcon({
  status,
  fallback,
}: {
  status: LeadLifecycleStatus | undefined;
  fallback: 'open' | 'closed';
}) {
  const className = 'size-3.5';
  if (status === 'completed') {
    return <CheckCircle2 className={className} strokeWidth={2} />;
  }
  if (status === 'cancelled' || fallback === 'closed') {
    return <CircleX className={className} strokeWidth={2} />;
  }
  if (status === 'in_progress') {
    return <Circle className={className} strokeWidth={2} />;
  }
  return <CheckCircle2 className={className} strokeWidth={2} />;
}

function PersonCard({
  title,
  name,
  nameHref,
  email,
  phone,
}: {
  title: string;
  name: string;
  nameHref?: string | null;
  email: string;
  phone: string;
}) {
  const initial = name !== '-' ? name.trim().charAt(0).toUpperCase() : '?';
  const nameValue = nameHref ? (
    <Link href={nameHref} className="text-primary hover:underline">
      {name}
    </Link>
  ) : (
    name
  );
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start gap-3 p-5 pb-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-lg font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{nameValue}</p>
        </div>
      </div>
      <div className="border-t border-border px-5 py-4">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <PrefField
            icon={<Mail className="size-3.5" strokeWidth={1.8} />}
            label="Email"
            value={email || '-'}
          />
          <PrefField
            icon={<Phone className="size-3.5" strokeWidth={1.8} />}
            label="Phone"
            value={phone || '-'}
          />
        </div>
      </div>
    </Card>
  );
}

export function LeadDetailScreen({id}: {id: string}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, catalog] = await Promise.all([getLead(Number(id)), listServices()]);
      setLead(detail);
      setServices(catalog);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load lead.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const serviceName = useMemo(() => {
    if (!lead) return undefined;
    return (
      services.find(item => item.id === lead.serviceId)?.name ??
      lead.service ??
      (lead.serviceId != null ? `Service ${lead.serviceId}` : undefined)
    );
  }, [lead, services]);

  const prefs = useMemo(
    () => (lead ? leadPreferenceDisplay(lead, serviceName) : null),
    [lead, serviceName],
  );

  if (loading) {
    return <LoadingState label="Loading lead..." />;
  }

  if (error || !lead || !prefs) {
    return <ErrorState body={error ?? 'Lead not found.'} onRetry={() => void load()} />;
  }

  const statusLabel = lifecycleLabel(lead.leadStatus, lead.status);
  const statusTone = lifecycleTone(lead.leadStatus, lead.status);
  const initial = prefs.goal.trim().charAt(0).toUpperCase() || 'L';
  const clientName = lead.clientName?.trim() || '-';
  const coachName = lead.assignedCoachName?.trim() || '-';

  return (
    <>
      <div className="mb-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to leads
        </Link>
      </div>

      <PageHeader
        title={`Lead ${lead.id}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4">
        <Card className="overflow-hidden p-0">
          <div className="flex items-start gap-3 p-5 pb-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xl font-bold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">{prefs.goal}</h2>
              <div className="mt-2">
                <Badge tone={statusTone} className="gap-1">
                  <StatusIcon status={lead.leadStatus} fallback={lead.status} />
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-5 py-4">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Preferences</h3>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {PREFERENCE_ROWS.map(field => (
                <PrefField
                  key={field.key}
                  icon={field.icon}
                  label={field.label}
                  value={prefs[field.key]}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-border px-5 py-3">
            <p className="text-sm text-muted-foreground">{formatPostedAt(lead.postedAt)}</p>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <PersonCard
            title="Client"
            name={clientName}
            nameHref={lead.clientId ? `/clients/${lead.clientId}` : null}
            email={lead.clientEmail || '-'}
            phone={lead.clientPhone || '-'}
          />
          <PersonCard
            title="Coach"
            name={coachName}
            nameHref={
              lead.assignedCoachName && lead.assignedCoachId
                ? `/professionals/${lead.assignedCoachId}`
                : null
            }
            email={lead.assignedCoachEmail || '-'}
            phone={lead.assignedCoachPhone || '-'}
          />
        </div>
      </div>
    </>
  );
}
