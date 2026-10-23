'use client';

import {useCallback, useEffect, useState} from 'react';
import {isApiError, type SessionUser} from '@/api';
import type {CreditBenefit, CreditBenefitKind} from '@/api/types';
import {
  createCreditBenefit,
  deleteCreditBenefit,
  listCreditBenefits,
  updateCreditBenefit,
} from '@/lib/apis';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {can} from '@/lib/permissions';
import {cn} from '@/lib/cn';

type Props = {
  user: SessionUser;
  onChange?: () => void;
};

type BenefitDraft = {
  title: string;
  type: CreditBenefitKind | '';
  value: string;
  expiryDays: string;
};

const BENEFIT_TYPE_OPTIONS: {value: CreditBenefitKind; label: string}[] = [
  {value: 'unlock_credit_discount', label: 'Unlock discount'},
  {value: 'free_unlocks', label: 'Free unlocks'},
  {value: 'founding_badge', label: 'Founding Badge'},
  {value: 'auto_grant', label: 'Auto grant'},
];

const CREATABLE_BENEFIT_TYPES: CreditBenefitKind[] = [
  'unlock_credit_discount',
  'free_unlocks',
];

const LOCKED_BENEFIT_TYPES: CreditBenefitKind[] = ['founding_badge', 'auto_grant'];

const emptyForm: BenefitDraft = {title: '', type: '', value: '', expiryDays: ''};

const tableInputClass =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary';
const tableSelectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary';

function formatBenefitValue(benefit: CreditBenefit) {
  if (benefit.type === 'founding_badge') return 'Founding Badge';
  if (benefit.type === 'auto_grant') return 'Free plan on first verification';
  if (benefit.type === 'free_unlocks') {
    const n = benefit.value ?? 0;
    return `${n} complimentary unlock${n === 1 ? '' : 's'}`;
  }
  if (benefit.value == null) return '—';
  return `${benefit.value}% unlock discount`;
}

function formatExpiry(benefit: CreditBenefit) {
  if (benefit.expiryDays == null) return '-';
  const n = benefit.expiryDays;
  return `${n} day${n === 1 ? '' : 's'}`;
}

function typeLabel(type: CreditBenefit['type']) {
  return BENEFIT_TYPE_OPTIONS.find(item => item.value === type)?.label ?? type;
}

function needsNumericValue(type: CreditBenefitKind | '') {
  return type === 'unlock_credit_discount' || type === 'free_unlocks';
}

function parseExpiryDays(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1 || n > 3650) return 'invalid';
  return Math.round(n);
}

function draftFromBenefit(b: CreditBenefit): BenefitDraft {
  return {
    title: b.title,
    type: b.type,
    value: b.value != null ? String(b.value) : '',
    expiryDays: b.expiryDays != null ? String(b.expiryDays) : '',
  };
}

export function CreditBenefitsPanel({user, onChange}: Props) {
  const canWrite = can(user, 'credits:write');
  const [items, setItems] = useState<CreditBenefit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, BenefitDraft>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BenefitDraft>(emptyForm);

  const colCount = canWrite ? 5 : 4;

  const load = useCallback(
    async (notify = false) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listCreditBenefits();
        setItems(rows);
        setDrafts(Object.fromEntries(rows.map(b => [b.id, draftFromBenefit(b)])));
        if (notify) onChange?.();
      } catch (err) {
        setError(isApiError(err) ? err.message : 'Could not load benefits.');
      } finally {
        setLoading(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const submitCreate = async () => {
    const title = form.title.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }
    if (!form.type || !CREATABLE_BENEFIT_TYPES.includes(form.type)) {
      setError('Please select a benefit type.');
      return;
    }
    if (!needsNumericValue(form.type)) {
      setError('This benefit type cannot be created here.');
      return;
    }
    const value = Number(form.value);
    if (form.type === 'unlock_credit_discount') {
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        setError('Discount percent must be from 1 to 100.');
        return;
      }
    } else if (!Number.isFinite(value) || value < 1 || value > 1000) {
      setError('Free unlocks must be from 1 to 1000.');
      return;
    }
    const expiryDays = parseExpiryDays(form.expiryDays);
    if (expiryDays === 'invalid') {
      setError('Expiry days must be from 1 to 3650, or empty for lifetime.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createCreditBenefit({
        title,
        type: form.type,
        value,
        expiryDays,
      });
      setForm(emptyForm);
      await load(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not create benefit.');
    } finally {
      setCreating(false);
    }
  };

  const saveRow = async (benefit: CreditBenefit) => {
    const draft = drafts[benefit.id];
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setError('Title cannot be empty.');
      return;
    }
    const expiryDays = parseExpiryDays(draft.expiryDays);
    if (expiryDays === 'invalid') {
      setError('Expiry days must be from 1 to 3650, or empty for lifetime.');
      return;
    }
    setSavingId(benefit.id);
    setError(null);
    try {
      if (benefit.type === 'founding_badge' || benefit.type === 'auto_grant') {
        await updateCreditBenefit(benefit.id, {title, expiryDays});
      } else if (benefit.type === 'free_unlocks') {
        const value = Number(draft.value);
        if (!Number.isFinite(value) || value < 1 || value > 1000) {
          setError('Free unlocks must be from 1 to 1000.');
          return;
        }
        await updateCreditBenefit(benefit.id, {title, value, expiryDays});
      } else {
        const value = Number(draft.value);
        if (!Number.isFinite(value) || value < 1 || value > 100) {
          setError('Discount percent must be from 1 to 100.');
          return;
        }
        await updateCreditBenefit(benefit.id, {title, value, expiryDays});
      }
      setEditingId(null);
      await load(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update benefit.');
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (benefit: CreditBenefit) => {
    if (benefit.type === 'founding_badge') {
      setError('The Founding Professional badge cannot be deleted.');
      return;
    }
    if (benefit.type === 'auto_grant') {
      setError('Auto grant cannot be deleted. Unassign it from plans instead.');
      return;
    }
    setError(null);
    try {
      await deleteCreditBenefit(benefit.id);
      await load(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not delete benefit.');
    }
  };

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Credit Benefits</h2>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      <DataTable
        columnHeaderClassNames={
          canWrite
            ? [undefined, undefined, undefined, undefined, 'text-right']
            : undefined
        }
        columns={
          canWrite
            ? ['Title', 'Type', 'Benefit', 'Expiry', 'Actions']
            : ['Title', 'Type', 'Benefit', 'Expiry']
        }>
        {loading && items.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="px-4 py-8 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </td>
          </tr>
        ) : null}
        {items.map(benefit => {
          const draft = drafts[benefit.id] ?? draftFromBenefit(benefit);
          const isEditing = canWrite && editingId === benefit.id;
          const isLockedType = LOCKED_BENEFIT_TYPES.includes(benefit.type);

          return (
            <tr
              key={benefit.id}
              className={cn(
                'border-b border-border last:border-0',
                isEditing && 'bg-primary-soft/30',
              )}>
              <td className="px-4 py-2">
                {isEditing ? (
                  <input
                    className={tableInputClass}
                    value={draft.title}
                    onChange={e =>
                      setDrafts(state => ({
                        ...state,
                        [benefit.id]: {...draft, title: e.target.value},
                      }))
                    }
                  />
                ) : (
                  <span className="text-sm font-medium text-foreground">{benefit.title}</span>
                )}
              </td>
              <td className="px-4 py-2">
                {isEditing ? (
                  <select
                    className={tableSelectClass}
                    value={draft.type}
                    disabled={isLockedType}
                    onChange={e =>
                      setDrafts(state => ({
                        ...state,
                        [benefit.id]: {
                          ...draft,
                          type: e.target.value as CreditBenefitKind,
                          value: '',
                        },
                      }))
                    }>
                    {(isLockedType
                      ? BENEFIT_TYPE_OPTIONS.filter(option => option.value === benefit.type)
                      : BENEFIT_TYPE_OPTIONS.filter(option =>
                          CREATABLE_BENEFIT_TYPES.includes(option.value),
                        )
                    ).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-foreground">{typeLabel(benefit.type)}</span>
                )}
              </td>
              <td className="px-4 py-2">
                {isEditing && needsNumericValue(draft.type) ? (
                  <input
                    className={tableInputClass}
                    type="number"
                    min={1}
                    max={draft.type === 'free_unlocks' ? 1000 : 100}
                    value={draft.value}
                    placeholder={draft.type === 'free_unlocks' ? 'N' : '%'}
                    onChange={e =>
                      setDrafts(state => ({
                        ...state,
                        [benefit.id]: {...draft, value: e.target.value},
                      }))
                    }
                  />
                ) : (
                  <span className="text-sm text-foreground">{formatBenefitValue(benefit)}</span>
                )}
              </td>
              <td className="px-4 py-2">
                {isEditing ? (
                  <input
                    className={tableInputClass}
                    type="number"
                    min={1}
                    max={3650}
                    value={draft.expiryDays}
                    placeholder="-"
                    title="Days after grant; empty = lifetime"
                    onChange={e =>
                      setDrafts(state => ({
                        ...state,
                        [benefit.id]: {...draft, expiryDays: e.target.value},
                      }))
                    }
                  />
                ) : (
                  <span className="text-sm text-foreground">{formatExpiry(benefit)}</span>
                )}
              </td>
              {canWrite ? (
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setDrafts(state => ({
                              ...state,
                              [benefit.id]: draftFromBenefit(benefit),
                            }));
                          }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={savingId === benefit.id}
                          onClick={() => void saveRow(benefit)}>
                          {savingId === benefit.id ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditingId(benefit.id)}>
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={isLockedType}
                      onClick={() => void removeRow(benefit)}>
                      Delete
                    </Button>
                  </div>
                </td>
              ) : null}
            </tr>
          );
        })}
        {canWrite ? (
          <tr className="border-t-2 border-border bg-primary-soft/40">
            <td className="px-4 py-2">
              <input
                className={tableInputClass}
                value={form.title}
                placeholder="10% unlock discount"
                onChange={e => setForm(f => ({...f, title: e.target.value}))}
              />
            </td>
            <td className="px-4 py-2">
              <select
                className={tableSelectClass}
                value={form.type}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    type: e.target.value as CreditBenefitKind | '',
                    value: '',
                  }))
                }>
                <option value="" disabled>
                  Please select
                </option>
                {BENEFIT_TYPE_OPTIONS.filter(option =>
                  CREATABLE_BENEFIT_TYPES.includes(option.value),
                ).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-4 py-2">
              {needsNumericValue(form.type) ? (
                <input
                  className={tableInputClass}
                  type="number"
                  min={1}
                  max={form.type === 'free_unlocks' ? 1000 : 100}
                  value={form.value}
                  placeholder={form.type === 'free_unlocks' ? 'N' : '%'}
                  onChange={e => setForm(f => ({...f, value: e.target.value}))}
                />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-2">
              <input
                className={tableInputClass}
                type="number"
                min={1}
                max={3650}
                value={form.expiryDays}
                placeholder="-"
                title="Days after grant; empty = lifetime"
                onChange={e => setForm(f => ({...f, expiryDays: e.target.value}))}
              />
            </td>
            <td className="px-4 py-2 text-right">
              <Button
                size="sm"
                disabled={
                  creating ||
                  !form.title.trim() ||
                  !form.type ||
                  (needsNumericValue(form.type) && !form.value)
                }
                onClick={() => void submitCreate()}>
                {creating ? '…' : 'Add'}
              </Button>
            </td>
          </tr>
        ) : null}
      </DataTable>
    </div>
  );
}
