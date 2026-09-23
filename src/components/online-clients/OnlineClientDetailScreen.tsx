'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  getOnlinePlan,
  isApiError,
  listServices,
  type CatalogService,
  type LeadDetail,
  type LeadLifecycleStatus,
  type OnlinePlanDetail,
  type OnlinePlanRevision,
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

function planStatusTone(status: string): 'primary' | 'muted' | 'warning' | 'danger' {
  if (status === 'published') return 'primary';
  if (status === 'draft') return 'warning';
  if (status === 'completed') return 'muted';
  return 'muted';
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

function SectionTitle({children}: {children: ReactNode}) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function asDays(program: unknown): Array<Record<string, unknown>> {
  return Array.isArray(program) ? (program as Array<Record<string, unknown>>) : [];
}

function asNutrition(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asIntake(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asProgress(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatWhen(value: unknown): string {
  if (value == null || value === '') {
    return '-';
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function TrainingDays({days}: {days: Array<Record<string, unknown>>}) {
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">No program days yet.</p>;
  }
  return (
    <div className="grid gap-4">
      {days.map(day => {
        const exercises = Array.isArray(day.exercises)
          ? (day.exercises as Array<Record<string, unknown>>)
          : [];
        return (
          <div key={String(day.id)} className="rounded-xl border border-border p-4">
            <p className="font-display font-bold">{String(day.day ?? '-')}</p>
            {day.focus ? (
              <p className="text-sm text-muted-foreground">{String(day.focus)}</p>
            ) : null}
            <ul className="mt-3 grid gap-2">
              {exercises.length === 0 ? (
                <li className="text-sm text-muted-foreground">-</li>
              ) : (
                exercises.map(ex => {
                  const meta = [
                    ex.sets || ex.reps
                      ? `${String(ex.sets ?? '')} x ${String(ex.reps ?? '')}`
                      : null,
                    ex.rest ? `Rest ${String(ex.rest)}` : null,
                    ex.rpe ? `Intensity ${String(ex.rpe)}` : null,
                  ].filter(Boolean);
                  return (
                    <li
                      key={String(ex.id)}
                      className="rounded-lg bg-secondary px-3 py-2 text-sm">
                      <p className="font-medium">{String(ex.name ?? '-')}</p>
                      {meta.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{meta.join(' | ')}</p>
                      ) : null}
                      {ex.notes != null && String(ex.notes).trim() ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {String(ex.notes)}
                        </p>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function NutritionBlock({nutrition}: {nutrition: Record<string, unknown>}) {
  const meals = Array.isArray(nutrition.meals)
    ? (nutrition.meals as Array<Record<string, unknown>>)
    : [];
  if (nutrition.calories == null && meals.length === 0) {
    return <p className="text-sm text-muted-foreground">No nutrition plan yet.</p>;
  }
  return (
    <>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <PrefField
          icon={<Target className="size-3.5" strokeWidth={1.8} />}
          label="Calories"
          value={
            nutrition.calories != null ? `${String(nutrition.calories)} kcal` : '-'
          }
        />
        <PrefField
          icon={<Dumbbell className="size-3.5" strokeWidth={1.8} />}
          label="Protein"
          value={
            nutrition.protein != null ? `${String(nutrition.protein)} g` : '-'
          }
        />
        <PrefField
          icon={<Sparkles className="size-3.5" strokeWidth={1.8} />}
          label="Carbs"
          value={nutrition.carbs != null ? `${String(nutrition.carbs)} g` : '-'}
        />
        <PrefField
          icon={<Sparkles className="size-3.5" strokeWidth={1.8} />}
          label="Fats"
          value={nutrition.fats != null ? `${String(nutrition.fats)} g` : '-'}
        />
        <div className="sm:col-span-2">
          <PrefField
            icon={<ClipboardList className="size-3.5" strokeWidth={1.8} />}
            label="Notes"
            value={String(nutrition.notes ?? '-')}
          />
        </div>
      </div>
      {meals.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {meals.map(meal => (
            <li
              key={String(meal.id)}
              className="rounded-lg bg-secondary px-3 py-2 text-sm">
              <p className="font-medium">{String(meal.name ?? '-')}</p>
              {meal.idea ? (
                <p className="text-xs text-muted-foreground">{String(meal.idea)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function RevisionCard({revision}: {revision: OnlinePlanRevision}) {
  const [open, setOpen] = useState(false);
  const days = asDays(revision.program);
  const nutrition = asNutrition(revision.nutrition);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-start hover:bg-secondary/60"
        onClick={() => setOpen(value => !value)}>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Version {revision.version}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatWhen(revision.publishedAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              `${revision.summary.trainingDays} training days`,
              revision.summary.calories != null
                ? `${revision.summary.calories} kcal`
                : null,
              revision.summary.protein != null
                ? `${revision.summary.protein} g protein`
                : null,
            ]
              .filter(Boolean)
              .join(' | ')}
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="grid gap-4 border-t border-border px-4 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Training
            </p>
            <TrainingDays days={days} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nutrition
            </p>
            <NutritionBlock nutrition={nutrition} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OnlineClientDetailScreen({id}: {id: string}) {
  const [plan, setPlan] = useState<OnlinePlanDetail | null>(null);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getOnlinePlan(Number(id));
      setPlan(detail);
      const [catalog, leadDetail] = await Promise.all([
        listServices(),
        detail.leadId
          ? getLead(detail.leadId).catch(() => null)
          : Promise.resolve(null),
      ]);
      setServices(catalog);
      setLead(leadDetail);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const serviceName = useMemo(() => {
    if (!lead) return plan?.goal;
    return (
      services.find(item => item.id === lead.serviceId)?.name ??
      lead.service ??
      plan?.goal ??
      (lead.serviceId != null ? `Service ${lead.serviceId}` : undefined)
    );
  }, [lead, plan?.goal, services]);

  const prefs = useMemo(
    () => (lead ? leadPreferenceDisplay(lead, serviceName) : null),
    [lead, serviceName],
  );

  if (loading) {
    return <LoadingState label="Loading plan..." />;
  }

  if (error || !plan) {
    return <ErrorState body={error ?? 'Plan not found.'} onRetry={() => void load()} />;
  }

  const days = asDays(plan.program);
  const nutrition = asNutrition(plan.nutrition);
  const intake = asIntake(plan.intake);
  const progress = asProgress(plan.progress);
  const parqAnswers =
    intake.parqAnswers &&
    typeof intake.parqAnswers === 'object' &&
    !Array.isArray(intake.parqAnswers)
      ? (intake.parqAnswers as Record<string, unknown>)
      : {};
  const checkins = Array.isArray(progress.checkins)
    ? ([...progress.checkins] as Array<Record<string, unknown>>).reverse()
    : [];
  const measurements = Array.isArray(progress.measurements)
    ? ([...progress.measurements] as Array<Record<string, unknown>>).reverse()
    : [];
  const weights = Array.isArray(progress.weight)
    ? (progress.weight as number[])
    : [];
  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const revisions = Array.isArray(plan.revisions) ? plan.revisions : [];
  const parqQuestions = Array.isArray(plan.parqQuestions) ? plan.parqQuestions : [];

  const goalTitle = prefs?.goal?.trim() || plan.goal || 'Online plan';
  const initial = goalTitle.charAt(0).toUpperCase() || 'P';
  const clientName =
    lead?.clientName?.trim() || plan.name?.trim() || '-';
  const hasAssignedCoach = Boolean(
    (lead?.assignedCoachId != null && lead.assignedCoachId !== '') ||
      lead?.assignedCoachName?.trim() ||
      (plan.coachId > 0 && plan.coachName?.trim()),
  );
  const coachName =
    lead?.assignedCoachName?.trim() || plan.coachName?.trim() || '-';
  const coachId = lead?.assignedCoachId ?? (plan.coachId > 0 ? String(plan.coachId) : null);
  const clientId = lead?.clientId ?? plan.clientUserId;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/online-clients"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to online plans
        </Link>
      </div>

      <PageHeader
        title={
          plan.leadId ? (
            <>
              Plan #{plan.id} |{' '}
              <Link
                href={`/leads/${plan.leadId}`}
                className="text-primary hover:underline">
                Lead #{plan.leadId}
              </Link>
            </>
          ) : (
            `Plan #${plan.id}`
          )
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4">
        {prefs && lead ? (
          <Card className="overflow-hidden p-0">
            <div className="flex items-start gap-3 p-5 pb-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xl font-bold text-primary">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">{goalTitle}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={planStatusTone(plan.status)}>{plan.status}</Badge>
                  <Badge tone={plan.parq === 'cleared' ? 'primary' : 'danger'}>
                    PAR-Q {plan.parq}
                  </Badge>
                  <Badge
                    tone={lifecycleTone(lead.leadStatus, lead.status)}
                    className="gap-1">
                    <StatusIcon status={lead.leadStatus} fallback={lead.status} />
                    Lead {lifecycleLabel(lead.leadStatus, lead.status)}
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
              <p className="text-sm text-muted-foreground">
                {formatPostedAt(lead.postedAt)}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="flex items-start gap-3 p-5 pb-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-xl font-bold text-primary">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground">{goalTitle}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={planStatusTone(plan.status)}>{plan.status}</Badge>
                  <Badge tone={plan.parq === 'cleared' ? 'primary' : 'danger'}>
                    PAR-Q {plan.parq}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <PersonCard
            title="Client"
            name={clientName}
            nameHref={clientId ? `/clients/${clientId}` : null}
            email={lead?.clientEmail || plan.clientUserEmail || '-'}
            phone={lead?.clientPhone || '-'}
          />
          {hasAssignedCoach ? (
            <PersonCard
              title="Coach"
              name={coachName}
              nameHref={coachId ? `/professionals/${coachId}` : null}
              email={lead?.assignedCoachEmail || '-'}
              phone={lead?.assignedCoachPhone || '-'}
            />
          ) : null}
        </div>

        <Card>
          <SectionTitle>PAR-Q+</SectionTitle>
          {parqQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PAR-Q questions loaded.</p>
          ) : (
            <ul className="grid gap-2">
              {parqQuestions.map(question => {
                const answer = parqAnswers[question.id];
                const answered = typeof answer === 'boolean';
                return (
                  <li
                    key={question.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-secondary px-3 py-2 text-sm">
                    <p className="min-w-0 flex-1 text-foreground">{question.prompt}</p>
                    <Badge
                      tone={!answered ? 'muted' : answer ? 'danger' : 'primary'}>
                      {!answered ? 'Unanswered' : answer ? 'Yes' : 'No'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Training ({days.length} days)</SectionTitle>
          <TrainingDays days={days} />
        </Card>

        <Card>
          <SectionTitle>Nutrition</SectionTitle>
          <NutritionBlock nutrition={nutrition} />
        </Card>

        <Card>
          <SectionTitle>Progress</SectionTitle>
          <div className="mb-4 grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <PrefField
              icon={<Target className="size-3.5" strokeWidth={1.8} />}
              label="Latest weight"
              value={latestWeight != null ? `${latestWeight} kg` : '-'}
            />
            <PrefField
              icon={<ClipboardList className="size-3.5" strokeWidth={1.8} />}
              label="Measurements"
              value={String(measurements.length)}
            />
            <PrefField
              icon={<Repeat className="size-3.5" strokeWidth={1.8} />}
              label="Check-ins"
              value={String(checkins.length)}
            />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Measurements
          </p>
          {measurements.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">No measurements yet.</p>
          ) : (
            <ul className="mb-4 grid gap-2">
              {measurements.slice(0, 8).map((m, i) => (
                <li
                  key={String(m.at ?? i)}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm">
                  <p className="font-medium">{formatWhen(m.at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      m.weight != null ? `Weight ${String(m.weight)}` : null,
                      m.waist != null ? `Waist ${String(m.waist)}` : null,
                      m.chest != null ? `Chest ${String(m.chest)}` : null,
                      m.hips != null ? `Hips ${String(m.hips)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' | ') || String(m.notes ?? '-')}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent check-ins
          </p>
          {checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
          ) : (
            <ul className="grid gap-2">
              {checkins.slice(0, 8).map((item, i) => (
                <li
                  key={String(item.at ?? i)}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm">
                  <p className="font-medium">{formatWhen(item.at)}</p>
                  {item.note != null && String(item.note).trim() ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(item.note)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Publish history</SectionTitle>
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published versions yet.</p>
          ) : (
            <div className="grid gap-3">
              {revisions.map(revision => (
                <RevisionCard key={revision.id} revision={revision} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
