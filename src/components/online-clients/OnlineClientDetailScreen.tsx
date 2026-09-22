'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {ArrowLeft, ChevronDown, ChevronUp} from 'lucide-react';
import {
  getOnlinePlan,
  isApiError,
  type OnlinePlanDetail,
  type OnlinePlanRevision,
} from '@/api';
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

function TrainingDays({
  days,
}: {
  days: Array<Record<string, unknown>>;
}) {
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
                        <p className="text-xs text-muted-foreground">
                          {meta.join(' | ')}
                        </p>
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
      <dl className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Calories"
          value={
            nutrition.calories != null ? `${String(nutrition.calories)} kcal` : '-'
          }
        />
        <Field
          label="Protein"
          value={
            nutrition.protein != null ? `${String(nutrition.protein)} g` : '-'
          }
        />
        <Field
          label="Carbs"
          value={nutrition.carbs != null ? `${String(nutrition.carbs)} g` : '-'}
        />
        <Field
          label="Fats"
          value={nutrition.fats != null ? `${String(nutrition.fats)} g` : '-'}
        />
        <div className="sm:col-span-2">
          <Field label="Notes" value={String(nutrition.notes ?? '-')} />
        </div>
      </dl>
      {meals.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {meals.map(meal => (
            <li
              key={String(meal.id)}
              className="rounded-lg bg-secondary px-3 py-2 text-sm">
              <p className="font-medium">{String(meal.name ?? '-')}</p>
              {meal.idea ? (
                <p className="text-xs text-muted-foreground">
                  {String(meal.idea)}
                </p>
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
  const equipment = Array.isArray(intake.equipment)
    ? (intake.equipment as string[])
    : [];
  const checkins = Array.isArray(progress.checkins)
    ? ([...progress.checkins] as Array<Record<string, unknown>>).reverse()
    : [];
  const measurements = Array.isArray(progress.measurements)
    ? ([...progress.measurements] as Array<Record<string, unknown>>).reverse()
    : [];
  const weights = Array.isArray(progress.weight)
    ? (progress.weight as number[])
    : [];
  const latestWeight =
    weights.length > 0 ? weights[weights.length - 1] : null;
  const revisions = Array.isArray(plan.revisions) ? plan.revisions : [];
  const parqQuestions = Array.isArray(plan.parqQuestions)
    ? plan.parqQuestions
    : [];

  return (
    <>
      <PageHeader
        title={plan.name}
        description={`${plan.goal} | ${plan.frequency} | Coach ${plan.coachName}`}
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
            Overview
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
            <Field
              label="Lead"
              value={
                plan.leadId ? (
                  <Link
                    href={`/leads/${plan.leadId}`}
                    className="text-primary underline-offset-2 hover:underline">
                    #{plan.leadId}
                  </Link>
                ) : (
                  '-'
                )
              }
            />
            <Field label="Created" value={formatWhen(plan.createdAt)} />
            <Field label="Approved" value={formatWhen(plan.approvedAt)} />
            <Field label="Published" value={formatWhen(plan.publishedAt)} />
            <Field label="Updated" value={formatWhen(plan.updatedAt)} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Intake
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Goals" value={String(intake.goals ?? '-')} />
            <Field
              label="Experience"
              value={String(intake.experience || '-')}
            />
            <Field
              label="Days per week"
              value={
                intake.daysPerWeek != null ? String(intake.daysPerWeek) : '-'
              }
            />
            <Field
              label="Session minutes"
              value={
                intake.sessionMinutes != null
                  ? String(intake.sessionMinutes)
                  : '-'
              }
            />
            <div className="sm:col-span-2">
              <Field
                label="Equipment"
                value={equipment.length > 0 ? equipment.join(', ') : '-'}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Limitations"
                value={String(intake.limitations || '-')}
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes" value={String(intake.notes || '-')} />
            </div>
            <Field
              label="Intake completed"
              value={formatWhen(intake.completedAt)}
            />
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          PAR-Q+ answers
        </h2>
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
                  <p className="min-w-0 flex-1 text-foreground">
                    {question.prompt}
                  </p>
                  <Badge
                    tone={
                      !answered ? 'muted' : answer ? 'danger' : 'primary'
                    }>
                    {!answered ? 'Unanswered' : answer ? 'Yes' : 'No'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nutrition
          </h2>
          <NutritionBlock nutrition={nutrition} />
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </h2>
          <dl className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Latest weight"
              value={latestWeight != null ? `${latestWeight} kg` : '-'}
            />
            <Field label="Measurements" value={String(measurements.length)} />
            <Field label="Check-ins" value={String(checkins.length)} />
          </dl>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Measurements
          </p>
          {measurements.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">
              No measurements yet.
            </p>
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
              {checkins.slice(0, 5).map((item, i) => (
                <li
                  key={String(item.at ?? i)}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm">
                  <p className="font-medium">{formatWhen(item.at)}</p>
                  {item.weight != null ? (
                    <p className="text-xs text-muted-foreground">
                      Weight: {String(item.weight)}
                    </p>
                  ) : null}
                  {item.adherence != null ? (
                    <p className="text-xs text-muted-foreground">
                      Adherence: {String(item.adherence)}%
                    </p>
                  ) : null}
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
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Training program ({days.length} days)
        </h2>
        <TrainingDays days={days} />
      </Card>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Publish history
        </h2>
        {revisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published versions yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {revisions.map(revision => (
              <RevisionCard key={revision.id} revision={revision} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
