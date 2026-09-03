'use client';

import Link from 'next/link';
import {FormEvent, useEffect, useMemo, useState, type ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';
import {
  getProfessional,
  isApiError,
  listServices,
  openVerificationFile,
  updateProfessional,
  type CatalogService,
  type Professional,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {ErrorState} from '@/components/ui/ErrorState';
import {Input} from '@/components/ui/Input';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {
  locationLabels,
  profileCompletion,
  verificationLabels,
} from '@/lib/professional-utils';
import {can} from '@/lib/permissions';
import {NotificationPrefsPanel} from '@/components/support/NotificationPrefsPanel';

type EditForm = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  location: string;
  about: string;
  years: string;
  style: string;
  availability: string;
  priceFrom: string;
  radiusKm: string;
  serviceIds: number[];
  locations: Professional['locations'];
};

function completionChecks(pro: Professional) {
  const pricing = pro.pricing;
  const hasPricing =
    Object.keys(pricing?.rates ?? {}).length > 0 ||
    Boolean(pricing?.onlineMonthly) ||
    Boolean(pricing?.notes);
  return [
    {label: 'Account onboarded', done: pro.onboarded},
    {label: 'Name and email', done: Boolean(pro.name && pro.email)},
    {label: 'Services selected', done: pro.serviceIds.length > 0},
    {label: 'Locations set', done: pro.locations.length > 0},
    {label: 'Pricing set', done: hasPricing},
    {label: 'Documents uploaded', done: (pro.verificationFiles?.length ?? 0) > 0},
    {label: 'Verification submitted', done: pro.verificationStatus === 'pending' || pro.verificationStatus === 'verified'},
    {label: 'Profile activated', done: pro.activated},
  ];
}

function toEditForm(pro: Professional): EditForm {
  return {
    name: pro.name,
    email: pro.email,
    phone: pro.phone,
    specialty: pro.specialty,
    location: pro.location,
    about: pro.about,
    years: String(pro.years),
    style: pro.style,
    availability: pro.availability,
    priceFrom: pro.priceFrom,
    radiusKm: String(pro.radiusKm),
    serviceIds: [...pro.serviceIds],
    locations: [...pro.locations],
  };
}

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

export function ProfessionalDetailScreen({
  actor,
  id,
}: {
  actor: SessionUser;
  id: string;
}) {
  const canWrite = can(actor.role, 'professionals:write');
  const [pro, setPro] = useState<Professional | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingSuspend, setPendingSuspend] = useState(false);
  const [pendingActivate, setPendingActivate] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, catalog] = await Promise.all([getProfessional(id), listServices()]);
      setPro(detail);
      setServices(catalog.filter(item => item.active));
      setForm(toEditForm(detail));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load professional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const serviceNames = useMemo(() => {
    const byId = new Map(services.map(item => [item.id, item.name]));
    return (pro?.serviceIds ?? []).map(id => byId.get(id) ?? `#${id}`);
  }, [pro, services]);

  const pct = pro ? profileCompletion(pro) : 0;
  const checks = pro ? completionChecks(pro) : [];

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !pro) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateProfessional(pro.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        specialty: form.specialty,
        location: form.location,
        about: form.about,
        years: Number(form.years) || 0,
        style: form.style,
        availability: form.availability,
        priceFrom: form.priceFrom,
        radiusKm: Number(form.radiusKm) || 0,
        serviceIds: form.serviceIds,
        locations: form.locations,
      });
      setPro(updated);
      setForm(toEditForm(updated));
      setEditing(false);
    } catch (err) {
      setFormError(isApiError(err) ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspended = async () => {
    if (!pro) {
      return;
    }
    try {
      const updated = await updateProfessional(pro.id, {suspended: !pro.suspended});
      setPro(updated);
      setForm(toEditForm(updated));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update account status.');
    } finally {
      setPendingSuspend(false);
    }
  };

  const toggleActivated = async () => {
    if (!pro || pendingActivate === null) {
      return;
    }
    try {
      const updated = await updateProfessional(pro.id, {activated: pendingActivate});
      setPro(updated);
      setForm(toEditForm(updated));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update activation.');
    } finally {
      setPendingActivate(null);
    }
  };

  const toggleService = (id: number) => {
    if (!form) {
      return;
    }
    const next = form.serviceIds.includes(id)
      ? form.serviceIds.filter(item => item !== id)
      : [...form.serviceIds, id];
    setForm({...form, serviceIds: next});
  };

  const toggleLocation = (key: Professional['locations'][number]) => {
    if (!form) {
      return;
    }
    const next = form.locations.includes(key)
      ? form.locations.filter(item => item !== key)
      : [...form.locations, key];
    setForm({...form, locations: next});
  };

  if (loading) {
    return <LoadingState label="Loading professional…" />;
  }

  if (error || !pro || !form) {
    return (
      <ErrorState
        body={error ?? 'Professional not found.'}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href="/professionals"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to professionals
        </Link>
      </div>

      <PageHeader
        module="M4"
        title={pro.name}
        description={`${pro.specialty} · ${pro.location}`}
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditing(value => !value)}>
                {editing ? 'Cancel edit' : 'Edit profile'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPendingActivate(!pro.activated)}>
                {pro.activated ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant={pro.suspended ? 'primary' : 'destructive'}
                onClick={() => setPendingSuspend(true)}>
                {pro.suspended ? 'Unsuspend' : 'Suspend'}
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {pro.onboarded ? (
          <Badge tone="primary">Onboarded</Badge>
        ) : (
          <Badge tone="warning">Signup incomplete</Badge>
        )}
        <Badge tone={pro.verificationStatus === 'verified' ? 'primary' : pro.verificationStatus === 'pending' ? 'warning' : 'muted'}>
          {verificationLabels[pro.verificationStatus]}
        </Badge>
        {pro.suspended ? <Badge tone="danger">Suspended</Badge> : null}
        {pro.activated ? <Badge tone="primary">Live profile</Badge> : <Badge tone="muted">Not activated</Badge>}
        {pro.verificationStatus === 'rejected' && pro.verificationRejectedReason ? (
          <Badge tone="danger">Rejected: {pro.verificationRejectedReason}</Badge>
        ) : null}
        <Badge tone="sky">{pct}% complete</Badge>
      </div>

      {editing && canWrite ? (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Edit profile</h2>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <Input label="Public location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              <Input label="Specialty" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} />
              <Input label="Years experience" value={form.years} onChange={e => setForm({...form, years: e.target.value})} />
              <Input label="Coaching style" value={form.style} onChange={e => setForm({...form, style: e.target.value})} />
              <Input label="Availability" value={form.availability} onChange={e => setForm({...form, availability: e.target.value})} />
              <Input label="Price from" value={form.priceFrom} onChange={e => setForm({...form, priceFrom: e.target.value})} />
              <Input label="Radius (km)" value={form.radiusKm} onChange={e => setForm({...form, radiusKm: e.target.value})} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Services</p>
              <div className="flex flex-wrap gap-2">
                {services.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleService(item.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      form.serviceIds.includes(item.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Session locations</p>
              <div className="flex flex-wrap gap-2">
                {(['coach', 'client', 'online'] as const).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleLocation(key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      form.locations.includes(key)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}>
                    {locationLabels[key]}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              <span className="font-medium">About</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                rows={4}
                value={form.about}
                onChange={e => setForm({...form, about: e.target.value})}
              />
            </label>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Account">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={pro.name} />
            <Field label="Email" value={pro.email} />
            <Field label="Phone" value={pro.phone} />
            <Field label="Member since" value={new Date(pro.createdAt).toLocaleDateString()} />
          </dl>
        </Section>

        <Section title="Notification preferences">
          <NotificationPrefsPanel prefs={pro.notificationPrefs} />
        </Section>

        <Section title="Profile completion">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{width: `${pct}%`}} />
            </div>
            <span className="text-sm font-semibold">{pct}%</span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {checks.map(item => (
              <li key={item.label} className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                {item.done ? '✓' : '○'} {item.label}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Services">
          <div className="flex flex-wrap gap-2">
            {serviceNames.map(name => (
              <Badge key={name} tone="sky">
                {name}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Location">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Public location" value={pro.location} />
            <Field label="Radius" value={`${pro.radiusKm} km`} />
            <Field
              label="Session types"
              value={pro.locations.map(key => locationLabels[key]).join(', ') || '—'}
            />
          </dl>
        </Section>

        <Section title="Onboarding pricing">
          {Object.keys(pro.pricing?.rates ?? {}).length === 0 &&
          !pro.pricing?.onlineMonthly &&
          !pro.pricing?.notes ? (
            <p className="text-sm text-muted-foreground">No rates set during coach onboarding.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(pro.pricing?.rates ?? {}).map(([serviceId, rate]) => {
                const serviceName =
                  services.find(item => String(item.id) === serviceId)?.name ?? `Service #${serviceId}`;
                return (
                  <div key={serviceId} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-semibold text-foreground">{serviceName}</p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Field label="Per session (AED)" value={rate.session || '—'} />
                      <Field label="10-session pack (AED)" value={rate.pack || '—'} />
                    </dl>
                  </div>
                );
              })}
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="Online monthly (AED)" value={pro.pricing?.onlineMonthly || '—'} />
                <Field
                  label="Free intro consult"
                  value={pro.pricing?.freeConsult ? 'Yes' : 'No'}
                />
              </dl>
              {pro.pricing?.notes ? (
                <p className="text-sm text-muted-foreground">{pro.pricing.notes}</p>
              ) : null}
            </div>
          )}
        </Section>

        <Section title="Match preferences">
          {(() => {
            const prefs = pro.matchPrefs;
            const listFields = [
              prefs?.services,
              prefs?.formats,
              prefs?.days,
              prefs?.times,
              prefs?.ages,
              prefs?.languages,
            ];
            const scalarEmpty = ![
              prefs?.frequency,
              prefs?.timesOther,
              prefs?.gender,
              prefs?.style,
              prefs?.startTraining,
              prefs?.routine,
              prefs?.routineOther,
            ].some(Boolean);
            const empty =
              !prefs || (listFields.every(list => !list?.length) && scalarEmpty);
            if (empty) {
              return (
                <p className="text-sm text-muted-foreground">
                  Coach has not set match preferences yet (shown as incomplete on their
                  dashboard).
                </p>
              );
            }
            return (
              <dl className="grid gap-3">
                {(
                  [
                    ['Services', prefs.services],
                    ['Formats', prefs.formats],
                    [
                      'Gender preference',
                      prefs.gender ? [prefs.gender] : [],
                    ],
                    ['Ages', prefs.ages],
                    ['Days', prefs.days],
                    ['Times', prefs.times],
                    ['Languages', prefs.languages],
                  ] as const
                ).map(([label, values]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {values?.length ? (
                        values.map(value => (
                          <Badge key={value} tone="sky">
                            {label === 'Formats'
                              ? (locationLabels[value] ?? value)
                              : value}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            );
          })()}
        </Section>

        <Section title="Public profile">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Gender" value={pro.gender === 'female' ? 'Female' : 'Male'} />
            <Field label="Years" value={pro.years} />
            <Field label="Style" value={pro.style} />
            <Field label="Availability" value={pro.availability} />
            <Field label="Price from" value={pro.priceFrom} />
            <Field label="Rating" value={`${pro.rating} (${pro.reviews} reviews)`} />
            <Field
              label="Formats"
              value={
                pro.formats.map(id => locationLabels[id] ?? id).join(', ') || '—'
              }
            />
            <Field label="Languages" value={pro.languages.join(', ')} />
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{pro.about || pro.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pro.profileCertifications.map(item => (
              <Badge key={item} tone="muted">
                {item}
              </Badge>
            ))}
          </div>
        </Section>

        <Section title="Client reviews">
          {(pro.reviewList ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews on file yet.</p>
          ) : (
            <ul className="space-y-3">
              {(pro.reviewList ?? []).map(review => (
                <li key={review.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{review.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.date} · {review.source}
                      </p>
                    </div>
                    <Badge tone="primary">{review.rating}★</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="ROI (from app activity)">
          {pro.roi ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Credits spent" value={pro.roi.creditsSpent} />
              <Field label="Leads unlocked" value={pro.roi.leadsUnlocked} />
              <Field label="Clients won" value={pro.roi.clientsWon} />
              <Field label="Revenue booked (est.)" value={`AED ${pro.roi.revenue}`} />
              <Field
                label="Conversion trend"
                value={pro.roi.conversionWeeks.join(' → ') + '%'}
              />
              <Field
                label="Response trend"
                value={pro.roi.responseRateWeeks.join(' → ') + '%'}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No ROI data yet.</p>
          )}
        </Section>

        <Section title="Documents">
          <ul className="space-y-2 text-sm">
            {(pro.verificationFiles ?? []).length ? (
              (pro.verificationFiles ?? []).map(file => (
                <li key={file.id}>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => void openVerificationFile(pro.id, file.id)}>
                    {file.originalName}
                  </button>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">None uploaded</li>
            )}
          </ul>
        </Section>

        <Section title="Wallet">
          <p className="mb-4 text-2xl font-bold text-foreground">{pro.credits} credits</p>
          {pro.txns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {pro.txns.map(txn => (
                <li key={txn.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{txn.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(txn.at).toLocaleString()}
                    </p>
                  </div>
                  <span className={txn.type === 'spend' ? 'text-destructive' : 'text-primary'}>
                    {txn.type === 'spend' ? '−' : '+'}
                    {txn.credits}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={pendingSuspend}
        title={pro.suspended ? 'Unsuspend account?' : 'Suspend account?'}
        body={
          pro.suspended
            ? `${pro.name} will be able to sign in and use the pro app again.`
            : `${pro.name} will be blocked from signing in until unsuspended.`
        }
        confirmLabel={pro.suspended ? 'Unsuspend' : 'Suspend'}
        destructive={!pro.suspended}
        onClose={() => setPendingSuspend(false)}
        onConfirm={() => void toggleSuspended()}
      />

      <ConfirmDialog
        open={pendingActivate !== null}
        title={pendingActivate ? 'Activate profile?' : 'Deactivate profile?'}
        body={
          pendingActivate
            ? 'The coach profile can go live in the marketplace once verification is approved.'
            : 'The profile will be hidden from clients until activated again.'
        }
        confirmLabel={pendingActivate ? 'Activate' : 'Deactivate'}
        onClose={() => setPendingActivate(null)}
        onConfirm={() => void toggleActivated()}
      />
    </>
  );
}
