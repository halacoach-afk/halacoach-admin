'use client';

import {useEffect, useState} from 'react';
import {
  getBillingSettings,
  getFeaturesSettings,
  getSupportContactSettings,
  isApiError,
  updateBillingSettings,
  updateFeaturesSettings,
  updateSupportContactSettings,
  type FeaturesSettings,
  type SessionUser,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {cn} from '@/lib/cn';
import {can} from '@/lib/permissions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const tableCellClass = 'flex h-9 items-center';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';

type FeatureFlagId = keyof FeaturesSettings;

type FeatureFlagDef = {
  id: FeatureFlagId;
  title: string;
  description: string;
};

/** Add new platform feature toggles here; wire matching keys on the features API. */
const FEATURE_FLAGS: FeatureFlagDef[] = [
  {
    id: 'onlinePlansEnabled',
    title: 'Personalized online plans',
    description:
      'When disabled, new personalized online training plans cannot be started. Existing personalized plans keep working.',
  },
];

function TableCell({children, className}: {children: React.ReactNode; className?: string}) {
  return <div className={cn(tableCellClass, className)}>{children}</div>;
}

function FeatureSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer',
      )}>
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export function SettingsScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'settings:write');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingFeatureId, setSavingFeatureId] = useState<FeatureFlagId | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [vatPercent, setVatPercent] = useState(5);
  const [draftVatPercent, setDraftVatPercent] = useState('5');
  const [features, setFeatures] = useState<FeaturesSettings>({
    onlinePlansEnabled: true,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [support, billing, nextFeatures] = await Promise.all([
        getSupportContactSettings(),
        getBillingSettings(),
        getFeaturesSettings(),
      ]);
      setSupportEmail(support.supportEmail);
      setSupportPhone(support.supportPhone);
      setDraftEmail(support.supportEmail);
      setDraftPhone(support.supportPhone);
      setVatPercent(billing.vatPercent);
      setDraftVatPercent(String(billing.vatPercent));
      setFeatures(nextFeatures);
      setEditing(false);
      setEditingBilling(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = () => {
    setDraftEmail(supportEmail);
    setDraftPhone(supportPhone);
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setDraftEmail(supportEmail);
    setDraftPhone(supportPhone);
    setEditing(false);
    setError(null);
  };

  const startBillingEdit = () => {
    setDraftVatPercent(String(vatPercent));
    setEditingBilling(true);
    setError(null);
  };

  const cancelBillingEdit = () => {
    setDraftVatPercent(String(vatPercent));
    setEditingBilling(false);
    setError(null);
  };

  const save = async () => {
    if (!canWrite) {
      return;
    }
    const email = draftEmail.trim();
    const phone = draftPhone.trim();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid support email.');
      return;
    }
    if (phone.length < 5) {
      setError('Enter a valid support phone number.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await updateSupportContactSettings({
        supportEmail: email,
        supportPhone: phone,
      });
      setSupportEmail(next.supportEmail);
      setSupportPhone(next.supportPhone);
      setDraftEmail(next.supportEmail);
      setDraftPhone(next.supportPhone);
      setEditing(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const saveBilling = async () => {
    if (!canWrite) {
      return;
    }
    const percent = Number(draftVatPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError('VAT must be a number from 0 to 100.');
      return;
    }
    setSavingBilling(true);
    setError(null);
    try {
      const next = await updateBillingSettings({vatPercent: percent});
      setVatPercent(next.vatPercent);
      setDraftVatPercent(String(next.vatPercent));
      setEditingBilling(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save billing settings.');
    } finally {
      setSavingBilling(false);
    }
  };

  const toggleFeature = async (id: FeatureFlagId) => {
    if (!canWrite || savingFeatureId) {
      return;
    }
    const nextValue = !features[id];
    setSavingFeatureId(id);
    setError(null);
    try {
      const next = await updateFeaturesSettings({[id]: nextValue});
      setFeatures(next);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update feature setting.');
    } finally {
      setSavingFeatureId(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading settings..." />;
  }

  if (error && !supportEmail && !supportPhone) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  const isEditing = canWrite && editing;
  const isBillingEditing = canWrite && editingBilling;
  const displayEmail = isEditing ? draftEmail : supportEmail;
  const displayPhone = isEditing ? draftPhone : supportPhone;

  return (
    <>
      <PageHeader
        title="Settings"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only - settings require settings write access.
        </p>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Support contact</h2>
      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={
            canWrite ? [undefined, undefined, 'text-right'] : undefined
          }
          columns={canWrite ? ['Email', 'Phone', 'Actions'] : ['Email', 'Phone']}>
          <tr
            className={cn(
              'border-b border-border last:border-0',
              isEditing && 'bg-primary-soft/30',
            )}>
            <td className="px-4 py-2">
              <TableCell>
                {isEditing ? (
                  <input
                    type="email"
                    className={tableInputClass}
                    value={displayEmail}
                    onChange={event => setDraftEmail(event.target.value)}
                    autoComplete="off"
                    disabled={saving}
                  />
                ) : (
                  <span className="font-medium text-foreground">{displayEmail}</span>
                )}
              </TableCell>
            </td>
            <td className="px-4 py-2">
              <TableCell>
                {isEditing ? (
                  <input
                    type="tel"
                    className={tableInputClass}
                    value={displayPhone}
                    onChange={event => setDraftPhone(event.target.value)}
                    autoComplete="off"
                    disabled={saving}
                  />
                ) : (
                  <span className="text-foreground">{displayPhone}</span>
                )}
              </TableCell>
            </td>
            {canWrite ? (
              <td className="px-4 py-2">
                <TableCell className="flex-nowrap justify-end gap-1">
                  {isEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      disabled={saving}
                      onClick={cancelEdit}>
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(actionButtonClass, 'invisible pointer-events-none')}
                      tabIndex={-1}
                      aria-hidden>
                      Cancel
                    </Button>
                  )}
                  {isEditing ? (
                    <Button
                      size="sm"
                      className={actionButtonClass}
                      disabled={saving}
                      onClick={() => void save()}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      onClick={startEdit}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </td>
            ) : null}
          </tr>
        </DataTable>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Features</h2>
      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={[undefined, undefined, 'text-right']}
          columns={['Feature', 'Status', 'Actions']}>
          {FEATURE_FLAGS.map(flag => {
            const enabled = Boolean(features[flag.id]);
            const savingThis = savingFeatureId === flag.id;
            return (
              <tr key={flag.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-middle">
                  <p className="font-medium text-foreground">{flag.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
                </td>
                <td className="px-4 py-3 align-middle whitespace-nowrap">
                  <span className="text-sm font-medium text-foreground">
                    {savingThis ? 'Saving…' : enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center justify-end">
                    <FeatureSwitch
                      checked={enabled}
                      disabled={!canWrite || savingFeatureId != null}
                      label={`${enabled ? 'Disable' : 'Enable'} ${flag.title}`}
                      onChange={() => void toggleFeature(flag.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Billing</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        VAT applied to credit pack checkout. Set to 0 to hide VAT on coach checkout and
        marketing copy.
      </p>
      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={canWrite ? [undefined, 'text-right'] : undefined}
          columns={canWrite ? ['VAT (%)', 'Actions'] : ['VAT (%)']}>
          <tr
            className={cn(
              'border-b border-border last:border-0',
              isBillingEditing && 'bg-primary-soft/30',
            )}>
            <td className="px-4 py-2">
              <TableCell>
                {isBillingEditing ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className={tableInputClass}
                    value={draftVatPercent}
                    onChange={event => setDraftVatPercent(event.target.value)}
                    disabled={savingBilling}
                  />
                ) : (
                  <span className="font-medium text-foreground">
                    {vatPercent}%
                    {vatPercent === 0 ? (
                      <span className="ms-2 text-sm font-normal text-muted-foreground">
                        (hidden on checkout)
                      </span>
                    ) : null}
                  </span>
                )}
              </TableCell>
            </td>
            {canWrite ? (
              <td className="px-4 py-2">
                <TableCell className="flex-nowrap justify-end gap-1">
                  {isBillingEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      disabled={savingBilling}
                      onClick={cancelBillingEdit}>
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(actionButtonClass, 'invisible pointer-events-none')}
                      tabIndex={-1}
                      aria-hidden>
                      Cancel
                    </Button>
                  )}
                  {isBillingEditing ? (
                    <Button
                      size="sm"
                      className={actionButtonClass}
                      disabled={savingBilling}
                      onClick={() => void saveBilling()}>
                      {savingBilling ? 'Saving...' : 'Save'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      onClick={startBillingEdit}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </td>
            ) : null}
          </tr>
        </DataTable>
      </div>
    </>
  );
}
