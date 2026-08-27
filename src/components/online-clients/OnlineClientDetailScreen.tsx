'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';
import {getOnlinePlan, isApiError, type OnlinePlanDetail} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Card} from '@/components/ui/Card';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';

function Field({label, value}: {label: string; value: ReactNode}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
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

export function OnlineClientDetailScreen({id}: {id: string}) {
  const [plan, setPlan] = useState<OnlinePlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setPlan(await getOnlinePlan(Number(id)));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading plan…" />;
  }

  if (error || !plan) {
    return <ErrorState body={error ?? 'Plan not found.'} onRetry={() => void load()} />;
  }

  const days = asDays(plan.program);
  const nutrition = asNutrition(plan.nutrition);
  const meals = Array.isArray(nutrition.meals)
    ? (nutrition.meals as Array<Record<string, unknown>>)
    : [];

  return (
    <>
      <PageHeader
        module="M6b"
        title={plan.name}
        description={`${plan.goal} · ${plan.frequency} · Coach ${plan.coachName}`}
        actions={
          <Link
            href="/online-clients"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            <ArrowLeft className="size-4" /> Back to plans
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Intake
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Status" value={<Badge>{plan.status}</Badge>} />
            <Field
              label="PAR-Q"
              value={
                <Badge tone={plan.parq === 'cleared' ? 'primary' : 'danger'}>
                  {plan.parq}
                </Badge>
              }
            />
            <Field label="Equipment" value={plan.equipment} />
            <Field label="Since" value={plan.since} />
            <Field label="Coach" value={plan.coachName} />
            <Field
              label="Linked account"
              value={
                plan.clientUserId ? (
                  <Link
                    href={`/clients/${plan.clientUserId}`}
                    className="text-primary underline-offset-2 hover:underline">
                    {plan.clientUserEmail ?? plan.clientUserId}
                  </Link>
                ) : (
                  'Not linked'
                )
              }
            />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nutrition
          </h2>
          {nutrition.calories != null ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Calories" value={String(nutrition.calories)} />
              <Field label="Protein" value={String(nutrition.protein ?? '—')} />
              <Field label="Carbs" value={String(nutrition.carbs ?? '—')} />
              <Field label="Fats" value={String(nutrition.fats ?? '—')} />
              <div className="sm:col-span-2">
                <Field label="Notes" value={String(nutrition.notes ?? '—')} />
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No nutrition plan yet.</p>
          )}
          {meals.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {meals.map(meal => (
                <li
                  key={String(meal.id)}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm">
                  <p className="font-medium">{String(meal.name)}</p>
                  <p className="text-xs text-muted-foreground">{String(meal.idea)}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Training program ({days.length} days)
        </h2>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No program days yet.</p>
        ) : (
          <div className="grid gap-4">
            {days.map(day => {
              const exercises = Array.isArray(day.exercises)
                ? (day.exercises as Array<Record<string, unknown>>)
                : [];
              return (
                <div key={String(day.id)} className="rounded-xl border border-border p-4">
                  <p className="font-display font-bold">{String(day.day)}</p>
                  <p className="text-sm text-muted-foreground">{String(day.focus)}</p>
                  <ul className="mt-3 grid gap-2">
                    {exercises.map(ex => (
                      <li
                        key={String(ex.id)}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">{String(ex.name)}</span>
                        <span className="text-muted-foreground">
                          {String(ex.sets)} × {String(ex.reps)} · {String(ex.rest)} ·{' '}
                          {String(ex.rpe)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
