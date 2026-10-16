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
};

const BENEFIT_TYPE_OPTIONS: {value: CreditBenefitKind; label: string}[] = [
  {value: 'unlock_credit_discount', label: 'Unlock discount'},
  {value: 'founding_badge', label: 'Founding Badge'},
];

const CREATABLE_BENEFIT_TYPES: CreditBenefitKind[] = ['unlock_credit_discount'];

const emptyForm: BenefitDraft = {title: '', type: '', value: ''};

const tableInputClass =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary';
const tableSelectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary';

function formatBenefitValue(benefit: CreditBenefit) {
  if (benefit.type === 'founding_badge') return 'Founding Badge';
  if (benefit.value == null) return '—';
  return `${benefit.value}% unlock discount`;
}

function typeLabel(type: CreditBenefit['type']) {
  return BENEFIT_TYPE_OPTIONS.find(item => item.value === type)?.label ?? type;
}

function needsPercentValue(type: CreditBenefitKind | '') {
  return type === 'unlock_credit_discount';
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

  const load = useCallback(async (notify = false) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCreditBenefits();
      setItems(rows);
      setDrafts(
        Object.fromEntries(
          rows.map(b => [
            b.id,
            {title: b.title, type: b.type, value: b.value != null ? String(b.value) : ''},
          ]),
        ),
      );
      if (notify) onChange?.();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load benefits.');
    } finally {
      setLoading(false);
    }
  }, [onChange]);

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
    if (needsPercentValue(form.type)) {
      const value = Number(form.value);
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        setError('Discount percent must be from 1 to 100.');
        return;
      }
      setCreating(true);
      setError(null);
      try {
        await createCreditBenefit({
          title,
          type: 'unlock_credit_discount',
          value,
        });
        setForm(emptyForm);
        await load(true);
      } catch (err) {
        setError(isApiError(err) ? err.message : 'Could not create benefit.');
      } finally {
        setCreating(false);
      }
      return;
    }
    setError('This benefit type cannot be created here.');
  };

  const saveRow = async (benefit: CreditBenefit) => {
    const draft = drafts[benefit.id];
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setError('Title cannot be empty.');
      return;
    }
    setSavingId(benefit.id);
    setError(null);
    try {
      if (benefit.type === 'founding_badge') {
        await updateCreditBenefit(benefit.id, {title});
      } else {
        const value = Number(draft.value);
        if (!Number.isFinite(value) || value < 1 || value > 100) {
          setError('Discount percent must be from 1 to 100.');
          return;
        }
        await updateCreditBenefit(benefit.id, {title, value});
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
          canWrite ? [undefined, undefined, undefined, 'text-right'] : undefined
        }
        columns={canWrite ? ['Title', 'Type', 'Benefit', 'Actions'] : ['Title', 'Type', 'Benefit']}>
        {loading && items.length === 0 ? (
          <tr>
            <td colSpan={canWrite ? 4 : 3} className="px-4 py-8 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </td>
          </tr>
        ) : null}
        {items.map(benefit => {
          const draft = drafts[benefit.id] ?? {
            title: benefit.title,
            type: benefit.type,
            value: benefit.value != null ? String(benefit.value) : '',
          };
          const isEditing = canWrite && editingId === benefit.id;
          const isFounding = benefit.type === 'founding_badge';

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
                    disabled={isFounding}
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
                    {(isFounding
                      ? BENEFIT_TYPE_OPTIONS.filter(option => option.value === 'founding_badge')
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
                {isEditing && needsPercentValue(draft.type) ? (
                  <input
                    className={tableInputClass}
                    type="number"
                    min={1}
                    max={100}
                    value={draft.value}
                    placeholder="%"
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
                              [benefit.id]: {
                                title: benefit.title,
                                type: benefit.type,
                                value: benefit.value != null ? String(benefit.value) : '',
                              },
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
                      disabled={isFounding}
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
              {needsPercentValue(form.type) ? (
                <input
                  className={tableInputClass}
                  type="number"
                  min={1}
                  max={100}
                  value={form.value}
                  placeholder="%"
                  onChange={e => setForm(f => ({...f, value: e.target.value}))}
                />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-2 text-right">
              <Button
                size="sm"
                disabled={
                  creating ||
                  !form.title.trim() ||
                  !form.type ||
                  (needsPercentValue(form.type) && !form.value)
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
