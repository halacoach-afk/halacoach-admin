'use client';

import {useEffect, useMemo, useState, type Dispatch, type SetStateAction} from 'react';
import {
  isApiError,
  type CreditsOverview,
  type SessionUser,
} from '@/api';
import {
  createCreditPackage,
  createPromoCode,
  listCreditPackages,
  listCreditSubscriptions,
  listPromoCodes,
  updateCreditPackage,
  updatePromoCode,
} from '@/lib/apis';
import {request} from '@/lib/request';
import type {
  CreditPackage,
  CreditPackageBadge,
  CreditPackageType,
  CreditSubscriptionAdmin,
  PromoBenefitType,
  PromoCode,
} from '@/api/types';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {DataTable, FilterBar} from '@/components/ui/DataTable';
import {EmptyState} from '@/components/ui/EmptyState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {formatAed, formatPromoBenefit, VAT_RATE} from '@/lib/credit-utils';
import {cn} from '@/lib/cn';
import {can} from '@/lib/permissions';

type TxnFilter = 'all' | 'purchase' | 'spend' | 'adjustment';

type CreditPackageDraft = {
  name: string;
  type: CreditPackageType;
  credits: string;
  price: string;
  badge: CreditPackageBadge | '';
};

type PromoDraft = {
  code: string;
  benefitType: PromoBenefitType;
  benefitValue: string;
};

const PROMO_BENEFIT_OPTIONS: {value: PromoBenefitType; label: string}[] = [
  {value: 'percent_off', label: 'Percentage off'},
  {value: 'fixed_off', label: 'Fixed amount (AED)'},
  {value: 'bonus_credits', label: 'Bonus credits'},
];

const emptyCreditPackageForm: CreditPackageDraft = {
  name: '',
  type: 'one_time',
  credits: '',
  price: '',
  badge: '',
};
const emptyPromoForm: PromoDraft = {code: '', benefitType: 'percent_off', benefitValue: '10'};

function promoDraftFromPromo(promo: PromoCode): PromoDraft {
  const benefitType = promo.benefitType ?? 'percent_off';
  const benefitValue = promo.benefitValue ?? 0;
  return {
    code: promo.code,
    benefitType,
    benefitValue:
      benefitType === 'percent_off'
        ? String(Math.round(benefitValue * 100))
        : String(benefitValue),
  };
}

function parsePromoDraft(
  draft: PromoDraft,
):
  | {code: string; benefitType: PromoBenefitType; benefitValue: number}
  | {error: string} {
  const code = draft.code.trim().toUpperCase();
  if (!code) {
    return {error: 'Promo code cannot be empty.'};
  }
  const raw = Number(draft.benefitValue);
  if (!Number.isFinite(raw)) {
    return {error: 'Enter a valid benefit value.'};
  }
  if (draft.benefitType === 'percent_off') {
    if (raw < 1 || raw > 50) {
      return {error: 'Discount must be between 1% and 50%.'};
    }
    return {code, benefitType: draft.benefitType, benefitValue: raw / 100};
  }
  if (draft.benefitType === 'fixed_off') {
    if (raw <= 0) {
      return {error: 'Fixed discount must be greater than zero.'};
    }
    return {code, benefitType: draft.benefitType, benefitValue: raw};
  }
  if (!Number.isInteger(raw) || raw < 1) {
    return {error: 'Bonus credits must be at least 1.'};
  }
  return {code, benefitType: draft.benefitType, benefitValue: raw};
}

function isPromoDraftValid(draft: PromoDraft): boolean {
  return !('error' in parsePromoDraft(draft));
}

function promoBenefitInputProps(benefitType: PromoBenefitType) {
  switch (benefitType) {
    case 'percent_off':
      return {min: 1, max: 50, placeholder: '10'};
    case 'fixed_off':
      return {min: 1, placeholder: '50'};
    case 'bonus_credits':
      return {min: 1, placeholder: '5'};
  }
}

const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const tableSelectClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const creditPackageTableCellClass = 'flex h-9 items-center';
const creditPackageActionButtonClass = 'w-[4.75rem] shrink-0 justify-center';
const creditPackageArchiveButtonClass = 'min-w-[5.5rem] shrink-0 justify-center';
const creditPackageAddButtonClass = cn(
  creditPackageActionButtonClass,
  'transform-gpu disabled:opacity-100 disabled:bg-primary-soft disabled:text-primary',
);

function CreditPackageTableCell({children, className}: {children: React.ReactNode; className?: string}) {
  return <div className={cn(creditPackageTableCellClass, className)}>{children}</div>;
}

function CatalogActions({
  isEditing,
  saving,
  onCancel,
  onSave,
  onEdit,
  toggleLabel,
  onToggle,
}: {
  isEditing: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onEdit: () => void;
  toggleLabel: string;
  onToggle: () => void;
}) {
  return (
    <CreditPackageTableCell className="flex-nowrap justify-end gap-1">
      {isEditing ? (
        <Button size="sm" variant="outline" className={creditPackageActionButtonClass} onClick={onCancel}>
          Cancel
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={cn(creditPackageActionButtonClass, 'invisible pointer-events-none')}
          tabIndex={-1}
          aria-hidden>
          Cancel
        </Button>
      )}
      {isEditing ? (
        <Button size="sm" className={creditPackageActionButtonClass} disabled={saving} onClick={onSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className={creditPackageActionButtonClass} onClick={onEdit}>
          Edit
        </Button>
      )}
      <Button size="sm" variant="outline" className={creditPackageArchiveButtonClass} onClick={onToggle}>
        {toggleLabel}
      </Button>
    </CreditPackageTableCell>
  );
}

export function CreditsScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor.role, 'credits:write');
  const [overview, setOverview] = useState<CreditsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [packages, setPackages] = useState<{items: CreditPackage[]; isLoading: boolean; error: string | null}>({
    items: [],
    isLoading: true,
    error: null,
  });
  const [subscriptions, setSubscriptions] = useState<{
    items: CreditSubscriptionAdmin[];
    isLoading: boolean;
    error: string | null;
  }>({items: [], isLoading: true, error: null});
  const [promos, setPromos] = useState<{items: PromoCode[]; isLoading: boolean; error: string | null}>({
    items: [],
    isLoading: true,
    error: null,
  });
  const [creditPackageDrafts, setCreditPackageDrafts] = useState<Record<number, CreditPackageDraft>>({});
  const [oneTimePackageForm, setOneTimePackageForm] = useState<CreditPackageDraft>({
    ...emptyCreditPackageForm,
    type: 'one_time',
  });
  const [membershipPackageForm, setMembershipPackageForm] = useState<CreditPackageDraft>({
    ...emptyCreditPackageForm,
    type: 'membership',
  });
  const [creditPackageError, setCreditPackageError] = useState<string | null>(null);
  const [savingCreditPackage, setSavingCreditPackage] = useState<number | null>(null);
  const [creatingCreditPackage, setCreatingCreditPackage] = useState(false);
  const [editingCreditPackageId, setEditingCreditPackageId] = useState<number | null>(null);
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('all');
  const [promoDrafts, setPromoDrafts] = useState<Record<number, PromoDraft>>({});
  const [promoForm, setPromoForm] = useState<PromoDraft>(emptyPromoForm);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [savingPromo, setSavingPromo] = useState<number | null>(null);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);

  const loadPackages = async () => {
    setPackages(s => ({...s, isLoading: true, error: null}));
    try {
      const items = await listCreditPackages();
      setPackages({items, isLoading: false, error: null});
      setCreditPackageDrafts(
        Object.fromEntries(
          items.map(pkg => [
            pkg.id,
            {
              name: pkg.name,
              type: pkg.type ?? 'one_time',
              credits: String(pkg.credits),
              price: String(pkg.price),
              badge: pkg.badge ?? '',
            },
          ]),
        ),
      );
    } catch (err) {
      setPackages(s => ({...s, isLoading: false, error: isApiError(err) ? err.message : 'Could not load packages.'}));
    }
  };

  const loadSubscriptions = async () => {
    setSubscriptions(s => ({...s, isLoading: true, error: null}));
    try {
      const items = await listCreditSubscriptions();
      setSubscriptions({items, isLoading: false, error: null});
    } catch (err) {
      setSubscriptions(s => ({
        ...s,
        isLoading: false,
        error: isApiError(err) ? err.message : 'Could not load subscriptions.',
      }));
    }
  };

  const loadPromos = async () => {
    setPromos(s => ({...s, isLoading: true, error: null}));
    try {
      const items = await listPromoCodes();
      setPromos({items, isLoading: false, error: null});
      setPromoDrafts(Object.fromEntries(items.map(promo => [promo.id, promoDraftFromPromo(promo)])));
    } catch (err) {
      setPromos(s => ({...s, isLoading: false, error: isApiError(err) ? err.message : 'Could not load promo codes.'}));
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const meta = await request<Omit<CreditsOverview, 'packs' | 'promos'>>('/v1/credits-meta');
      setOverview({...meta, packs: [], promos: []});
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load credits module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPackages();
    void loadSubscriptions();
    void loadPromos();
    void load();
  }, []);

  const transactions = useMemo(() => {
    if (!overview) {
      return [];
    }
    if (txnFilter === 'all') {
      return overview.transactions;
    }
    return overview.transactions.filter(item => item.type === txnFilter);
  }, [overview, txnFilter]);

  const oneTimePackages = useMemo(
    () => packages.items.filter(pack => (pack.type ?? 'one_time') === 'one_time'),
    [packages.items],
  );
  const membershipPackages = useMemo(
    () => packages.items.filter(pack => pack.type === 'membership'),
    [packages.items],
  );
  const vatRate = overview?.vatRate ?? VAT_RATE;

  const renderPackageCatalog = (
    type: CreditPackageType,
    items: CreditPackage[],
    form: CreditPackageDraft,
    setForm: Dispatch<SetStateAction<CreditPackageDraft>>,
    namePlaceholder: string,
    pricePlaceholder: string,
  ) => {
    const colSpan = canWrite ? 6 : 5;
    return (
      <div className="mb-8">
        <DataTable
          tableClassName="table-fixed"
          columnWidths={
            canWrite
              ? ['22%', '12%', '16%', '14%', '12%', '24%']
              : ['26%', '14%', '18%', '16%', '14%']
          }
          columnHeaderClassNames={
            canWrite
              ? [undefined, undefined, undefined, undefined, undefined, 'text-right']
              : undefined
          }
          columns={
            canWrite
              ? ['Name', 'Credits', 'Price (excl. VAT)', 'Badge', 'Incl. VAT', 'Actions']
              : ['Name', 'Credits', 'Price (excl. VAT)', 'Badge', 'Incl. VAT']
          }>
          {packages.isLoading && items.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </td>
            </tr>
          ) : null}
          {packages.error ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-6 text-center">
                <p className="mb-2 text-sm text-destructive">{packages.error}</p>
                <button
                  className="text-xs text-primary underline"
                  onClick={() => void loadPackages()}>
                  Retry
                </button>
              </td>
            </tr>
          ) : null}
          {!packages.isLoading && !packages.error && items.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-muted-foreground">
                No {type === 'membership' ? 'membership plans' : 'credit packages'} yet.
              </td>
            </tr>
          ) : null}
          {items.map(pack => {
            const draft = creditPackageDrafts[pack.id] ?? {
              name: pack.name,
              type: pack.type ?? type,
              credits: String(pack.credits),
              price: String(pack.price),
              badge: pack.badge ?? '',
            };
            const isEditing = canWrite && editingCreditPackageId === pack.id;
            const displayPrice = Number(isEditing ? draft.price : pack.price);
            const inclVat = Number.isFinite(displayPrice)
              ? formatAed(displayPrice * (1 + vatRate))
              : '—';

            return (
              <tr
                key={pack.id}
                className={cn(
                  'border-b border-border last:border-0',
                  !pack.active && 'bg-muted/30',
                  isEditing && 'bg-primary-soft/30',
                )}>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <input
                        className={tableInputClass}
                        value={draft.name}
                        onChange={e =>
                          setCreditPackageDrafts(state => ({
                            ...state,
                            [pack.id]: {...draft, name: e.target.value},
                          }))
                        }
                      />
                    ) : (
                      <span className="truncate font-medium text-foreground">{pack.name}</span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <input
                        className={tableInputClass}
                        type="number"
                        min={1}
                        value={draft.credits}
                        onChange={e =>
                          setCreditPackageDrafts(state => ({
                            ...state,
                            [pack.id]: {...draft, credits: e.target.value},
                          }))
                        }
                      />
                    ) : (
                      <span>{pack.credits}</span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <input
                        className={tableInputClass}
                        type="number"
                        min={1}
                        value={draft.price}
                        onChange={e =>
                          setCreditPackageDrafts(state => ({
                            ...state,
                            [pack.id]: {...draft, price: e.target.value},
                          }))
                        }
                      />
                    ) : (
                      <span>{formatAed(pack.price)}</span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <select
                        className={tableSelectClass}
                        value={draft.badge}
                        onChange={e =>
                          setCreditPackageDrafts(state => ({
                            ...state,
                            [pack.id]: {
                              ...draft,
                              badge: e.target.value as CreditPackageBadge | '',
                            },
                          }))
                        }>
                        <option value="">None</option>
                        <option value="popular">Popular</option>
                        <option value="value">Best value</option>
                      </select>
                    ) : pack.badge ? (
                      <Badge tone={pack.badge === 'popular' ? 'coral' : 'sky'}>{pack.badge}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    <span className="text-muted-foreground">{inclVat}</span>
                  </CreditPackageTableCell>
                </td>
                {canWrite ? (
                  <td className="px-4 py-2">
                    <CatalogActions
                      isEditing={isEditing}
                      saving={savingCreditPackage === pack.id}
                      onCancel={() => cancelEditCreditPackage(pack)}
                      onSave={() => void saveCreditPackage(pack.id)}
                      onEdit={() => startEditCreditPackage(pack)}
                      toggleLabel={pack.active ? 'Archive' : 'Restore'}
                      onToggle={() => void toggleCreditPackage(pack.id, !pack.active)}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
          {canWrite ? (
            <tr className="border-t-2 border-border bg-primary-soft/40">
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <input
                    className={tableInputClass}
                    value={form.name}
                    onChange={e => setForm(current => ({...current, name: e.target.value}))}
                    placeholder={namePlaceholder}
                  />
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <input
                    className={tableInputClass}
                    type="number"
                    min={1}
                    value={form.credits}
                    onChange={e => setForm(current => ({...current, credits: e.target.value}))}
                    placeholder="10"
                  />
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <input
                    className={tableInputClass}
                    type="number"
                    min={1}
                    value={form.price}
                    onChange={e => setForm(current => ({...current, price: e.target.value}))}
                    placeholder={pricePlaceholder}
                  />
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <select
                    className={tableSelectClass}
                    value={form.badge}
                    onChange={e =>
                      setForm(current => ({
                        ...current,
                        badge: e.target.value as CreditPackageBadge | '',
                      }))
                    }>
                    <option value="">None</option>
                    <option value="popular">Popular</option>
                    <option value="value">Best value</option>
                  </select>
                </CreditPackageTableCell>
              </td>
                <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <span className="text-muted-foreground">
                    {Number.isFinite(Number(form.price)) && form.price
                      ? formatAed(Number(form.price) * (1 + vatRate))
                      : '—'}
                  </span>
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell className="flex-nowrap justify-end gap-1">
                  <span className={creditPackageActionButtonClass} aria-hidden />
                  <Button
                    size="sm"
                    className={creditPackageAddButtonClass}
                    disabled={
                      creatingCreditPackage ||
                      !form.name.trim() ||
                      !(Number(form.credits) >= 1) ||
                      !(Number(form.price) > 0)
                    }
                    onClick={() => void submitCreateCreditPackage(type)}>
                    {creatingCreditPackage ? (
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/40 border-t-current" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                  <span className={creditPackageArchiveButtonClass} aria-hidden />
                </CreditPackageTableCell>
              </td>
            </tr>
          ) : null}
        </DataTable>
      </div>
    );
  };

  const saveCreditPackage = async (packId: number) => {
    const draft = creditPackageDrafts[packId];
    const credits = Number(draft?.credits);
    const price = Number(draft?.price);
    const name = draft?.name.trim() ?? '';
    if (!name) {
      setError('Credit package name cannot be empty.');
      return;
    }
    if (!Number.isFinite(credits) || credits < 1) {
      setError('Each credit package needs at least 1 credit.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid credit package price in AED.');
      return;
    }
    setSavingCreditPackage(packId);
    setError(null);
    try {
      await updateCreditPackage(packId, {
        name,
        credits,
        price,
        badge: draft.badge || null,
      });
      setEditingCreditPackageId(current => (current === packId ? null : current));
      await loadPackages();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update credit package.');
    } finally {
      setSavingCreditPackage(null);
    }
  };

  const submitCreateCreditPackage = async (type: CreditPackageType) => {
    const form = type === 'membership' ? membershipPackageForm : oneTimePackageForm;
    const setForm = type === 'membership' ? setMembershipPackageForm : setOneTimePackageForm;
    setCreditPackageError(null);
    const credits = Number(form.credits);
    const price = Number(form.price);
    if (!form.name.trim()) {
      setCreditPackageError('Name is required.');
      return;
    }
    if (!Number.isFinite(credits) || credits < 1) {
      setCreditPackageError('Credits must be at least 1.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setCreditPackageError('Price must be greater than zero.');
      return;
    }
    setCreatingCreditPackage(true);
    try {
      await createCreditPackage({
        name: form.name.trim(),
        type,
        credits,
        price,
        badge: form.badge || null,
      });
      setForm({...emptyCreditPackageForm, type});
      await loadPackages();
    } catch (err) {
      setCreditPackageError(isApiError(err) ? err.message : 'Could not create credit package.');
    } finally {
      setCreatingCreditPackage(false);
    }
  };

  const startEditCreditPackage = (pack: CreditPackage) => {
    if (editingCreditPackageId && editingCreditPackageId !== pack.id) {
      const previous = packages.items.find(item => item.id === editingCreditPackageId);
      if (previous) {
        setCreditPackageDrafts(state => ({
          ...state,
          [previous.id]: {
            name: previous.name,
            type: previous.type ?? 'one_time',
            credits: String(previous.credits),
            price: String(previous.price),
            badge: previous.badge ?? '',
          },
        }));
      }
    }
    setEditingCreditPackageId(pack.id);
    setCreditPackageDrafts(state => ({
      ...state,
      [pack.id]: {
        name: pack.name,
        type: pack.type ?? 'one_time',
        credits: String(pack.credits),
        price: String(pack.price),
        badge: pack.badge ?? '',
      },
    }));
    setError(null);
  };

  const cancelEditCreditPackage = (pack: CreditPackage) => {
    setCreditPackageDrafts(state => ({
      ...state,
      [pack.id]: {
        name: pack.name,
        type: pack.type ?? 'one_time',
        credits: String(pack.credits),
        price: String(pack.price),
        badge: pack.badge ?? '',
      },
    }));
    setEditingCreditPackageId(current => (current === pack.id ? null : current));
  };

  const toggleCreditPackage = async (packId: number, active: boolean) => {
    try {
      await updateCreditPackage(packId, {active});
      setEditingCreditPackageId(current => (current === packId ? null : current));
      await loadPackages();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update credit package.');
    }
  };

  const togglePromo = async (id: number, active: boolean) => {
    try {
      await updatePromoCode(id, {active});
      setEditingPromoId(current => (current === id ? null : current));
      await loadPromos();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update promo code.');
    }
  };

  const savePromo = async (promoId: number) => {
    const draft = promoDrafts[promoId];
    if (!draft) {
      return;
    }
    const parsed = parsePromoDraft(draft);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setSavingPromo(promoId);
    setError(null);
    try {
      await updatePromoCode(promoId, parsed);
      setEditingPromoId(current => (current === promoId ? null : current));
      await loadPromos();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update promo code.');
    } finally {
      setSavingPromo(null);
    }
  };

  const startEditPromo = (promo: PromoCode) => {
    if (editingPromoId && editingPromoId !== promo.id) {
      const previous = promos.items.find(item => item.id === editingPromoId);
      if (previous) {
        setPromoDrafts(state => ({
          ...state,
          [previous.id]: promoDraftFromPromo(previous),
        }));
      }
    }
    setEditingPromoId(promo.id);
    setPromoDrafts(state => ({
      ...state,
      [promo.id]: promoDraftFromPromo(promo),
    }));
    setError(null);
  };

  const cancelEditPromo = (promo: PromoCode) => {
    setPromoDrafts(state => ({
      ...state,
      [promo.id]: promoDraftFromPromo(promo),
    }));
    setEditingPromoId(current => (current === promo.id ? null : current));
  };

  const submitCreatePromo = async () => {
    setPromoError(null);
    const parsed = parsePromoDraft(promoForm);
    if ('error' in parsed) {
      setPromoError(parsed.error);
      return;
    }
    setCreatingPromo(true);
    try {
      await createPromoCode(parsed);
      setPromoForm(emptyPromoForm);
      await loadPromos();
    } catch (err) {
      setPromoError(isApiError(err) ? err.message : 'Could not create promo code.');
    } finally {
      setCreatingPromo(false);
    }
  };

  if (loading && !overview && packages.items.length === 0 && promos.items.length === 0) {
    return <LoadingState label="Loading credits…" />;
  }

  return (
    <>
      <PageHeader
        title="Credits"
        description="Packs, memberships, promo codes, VAT, and transactions."
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only — credit package prices and promo codes require super admin.
        </p>
      ) : null}

      {loading && !overview ? (
        <LoadingState label="Loading stats and transactions…" />
      ) : overview ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-medium uppercase text-muted-foreground">In wallets</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {overview.stats.totalCreditsInWallets} credits
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase text-muted-foreground">Purchases</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{overview.stats.purchaseCount}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase text-muted-foreground">Lead unlocks</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{overview.stats.spendCount}</p>
          </Card>
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Credit packages</h2>
      {renderPackageCatalog(
        'one_time',
        oneTimePackages,
        oneTimePackageForm,
        setOneTimePackageForm,
        'Starter',
        '199',
      )}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Membership plans</h2>
      {renderPackageCatalog(
        'membership',
        membershipPackages,
        membershipPackageForm,
        setMembershipPackageForm,
        'Lite',
        '149',
      )}
      {creditPackageError ? <p className="mb-6 text-sm text-destructive">{creditPackageError}</p> : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Subscriptions</h2>
      <div className="mb-8">
        <DataTable
          columns={['Coach', 'Plan', 'Status', 'Period end', 'Cancel at end']}
          columnWidths={['28%', '18%', '16%', '22%', '16%']}>
          {subscriptions.isLoading && subscriptions.items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </td>
            </tr>
          ) : null}
          {subscriptions.error ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center">
                <p className="mb-2 text-sm text-destructive">{subscriptions.error}</p>
                <button
                  className="text-xs text-primary underline"
                  onClick={() => void loadSubscriptions()}>
                  Retry
                </button>
              </td>
            </tr>
          ) : null}
          {!subscriptions.isLoading && !subscriptions.error && subscriptions.items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                No subscriptions yet.
              </td>
            </tr>
          ) : null}
          {subscriptions.items.map(sub => (
            <tr key={sub.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{sub.professionalName}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.professionalEmail ?? sub.professionalId}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-foreground">{sub.package?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.package
                    ? `${sub.package.credits} credits · ${formatAed(sub.package.price)}`
                    : ''}
                </p>
              </td>
              <td className="px-4 py-3">
                <Badge tone={sub.status === 'active' ? 'sky' : 'muted'}>{sub.status}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {sub.currentPeriodEnd
                  ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {sub.cancelAtPeriodEnd ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Promo codes</h2>
      <div className="mb-8">
        <DataTable
          tableClassName="table-fixed"
          columnWidths={
            canWrite ? ['16%', '22%', '16%', '12%', '34%'] : ['30%', '35%', '35%']
          }
          columnHeaderClassNames={
            canWrite
              ? [undefined, undefined, undefined, undefined, 'text-right']
              : undefined
          }
          columns={
            canWrite
              ? ['Code', 'Type', 'Benefit', 'Status', 'Actions']
              : ['Code', 'Type', 'Benefit', 'Status']
          }>
          {promos.isLoading && promos.items.length === 0 ? (
            <tr>
              <td colSpan={canWrite ? 5 : 4} className="px-4 py-8 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </td>
            </tr>
          ) : null}
          {promos.error ? (
            <tr>
              <td colSpan={canWrite ? 5 : 4} className="px-4 py-6 text-center">
                <p className="mb-2 text-sm text-destructive">{promos.error}</p>
                <button
                  className="text-xs text-primary underline"
                  onClick={() => void loadPromos()}>
                  Retry
                </button>
              </td>
            </tr>
          ) : null}
          {promos.items.map(promo => {
            const draft = promoDrafts[promo.id] ?? promoDraftFromPromo(promo);
            const isEditing = canWrite && editingPromoId === promo.id;
            const benefitInput = promoBenefitInputProps(draft.benefitType);

            return (
              <tr
                key={promo.id}
                className={cn(
                  'border-b border-border last:border-0',
                  !promo.active && 'bg-muted/30',
                  isEditing && 'bg-primary-soft/30',
                )}>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <input
                        className={cn(tableInputClass, 'font-mono uppercase')}
                        value={draft.code}
                        onChange={e =>
                          setPromoDrafts(state => ({
                            ...state,
                            [promo.id]: {...draft, code: e.target.value.toUpperCase()},
                          }))
                        }
                      />
                    ) : (
                      <span className="font-mono font-medium text-foreground">{promo.code}</span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <select
                        className={tableSelectClass}
                        value={draft.benefitType}
                        onChange={e =>
                          setPromoDrafts(state => ({
                            ...state,
                            [promo.id]: {
                              ...draft,
                              benefitType: e.target.value as PromoBenefitType,
                              benefitValue:
                                e.target.value === 'percent_off'
                                  ? '10'
                                  : e.target.value === 'fixed_off'
                                    ? '50'
                                    : '5',
                            },
                          }))
                        }>
                        {PROMO_BENEFIT_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-foreground">
                        {PROMO_BENEFIT_OPTIONS.find(item => item.value === promo.benefitType)?.label ??
                          promo.benefitType}
                      </span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {isEditing ? (
                      <input
                        className={cn(tableInputClass, 'max-w-[7rem]')}
                        type="number"
                        min={benefitInput.min}
                        max={'max' in benefitInput ? benefitInput.max : undefined}
                        value={draft.benefitValue}
                        onChange={e =>
                          setPromoDrafts(state => ({
                            ...state,
                            [promo.id]: {...draft, benefitValue: e.target.value},
                          }))
                        }
                        placeholder={benefitInput.placeholder}
                      />
                    ) : (
                      <span className="text-foreground">{formatPromoBenefit(promo)}</span>
                    )}
                  </CreditPackageTableCell>
                </td>
                <td className="px-4 py-2">
                  <CreditPackageTableCell>
                    {promo.active ? (
                      <Badge tone="primary">Active</Badge>
                    ) : (
                      <Badge tone="muted">Inactive</Badge>
                    )}
                  </CreditPackageTableCell>
                </td>
                {canWrite ? (
                  <td className="px-4 py-2">
                    <CatalogActions
                      isEditing={isEditing}
                      saving={savingPromo === promo.id}
                      onCancel={() => cancelEditPromo(promo)}
                      onSave={() => void savePromo(promo.id)}
                      onEdit={() => startEditPromo(promo)}
                      toggleLabel={promo.active ? 'Deactivate' : 'Activate'}
                      onToggle={() => void togglePromo(promo.id, !promo.active)}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
          {canWrite ? (
            <tr className="border-t-2 border-border bg-primary-soft/40">
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <input
                    className={cn(tableInputClass, 'font-mono uppercase')}
                    value={promoForm.code}
                    onChange={e =>
                      setPromoForm(form => ({...form, code: e.target.value.toUpperCase()}))
                    }
                    placeholder="HALA10"
                  />
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <select
                    className={tableSelectClass}
                    value={promoForm.benefitType}
                    onChange={e =>
                      setPromoForm(form => ({
                        ...form,
                        benefitType: e.target.value as PromoBenefitType,
                        benefitValue:
                          e.target.value === 'percent_off'
                            ? '10'
                            : e.target.value === 'fixed_off'
                              ? '50'
                              : '5',
                      }))
                    }>
                    {PROMO_BENEFIT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <input
                    className={cn(tableInputClass, 'max-w-[7rem]')}
                    type="number"
                    min={promoBenefitInputProps(promoForm.benefitType).min}
                    max={
                      'max' in promoBenefitInputProps(promoForm.benefitType)
                        ? promoBenefitInputProps(promoForm.benefitType).max
                        : undefined
                    }
                    value={promoForm.benefitValue}
                    onChange={e =>
                      setPromoForm(form => ({...form, benefitValue: e.target.value}))
                    }
                    placeholder={promoBenefitInputProps(promoForm.benefitType).placeholder}
                  />
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell>
                  <Badge tone="sky">New</Badge>
                </CreditPackageTableCell>
              </td>
              <td className="px-4 py-2">
                <CreditPackageTableCell className="flex-nowrap justify-end gap-1">
                  <span className={creditPackageActionButtonClass} aria-hidden />
                  <Button
                    size="sm"
                    className={creditPackageAddButtonClass}
                    disabled={creatingPromo || !isPromoDraftValid(promoForm)}
                    onClick={() => void submitCreatePromo()}>
                    {creatingPromo ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/40 border-t-current" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                  <span className={creditPackageArchiveButtonClass} aria-hidden />
                </CreditPackageTableCell>
              </td>
            </tr>
          ) : null}
        </DataTable>
        {promoError ? <p className="mt-2 text-sm text-destructive">{promoError}</p> : null}
      </div>

      {overview ? (<>
      <h2 className="mb-3 mt-8 text-lg font-semibold text-foreground">Transactions</h2>
      <FilterBar>
        {(
          [
            ['all', 'All'],
            ['purchase', 'Purchases'],
            ['spend', 'Unlocks'],
            ['adjustment', 'Adjustments'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={txnFilter === key ? 'primary' : 'outline'}
            onClick={() => setTxnFilter(key)}>
            {label}
          </Button>
        ))}
      </FilterBar>
      {transactions.length === 0 ? (
        <EmptyState title="No transactions" body="Try another filter." />
      ) : (
        <DataTable columns={['When', 'Coach', 'Type', 'Credits', 'Details', 'Paid']}>
          {transactions.map(txn => (
            <tr key={txn.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(txn.at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm">{txn.professionalName}</td>
              <td className="px-4 py-3">
                <Badge tone={txn.type === 'purchase' ? 'primary' : txn.type === 'spend' ? 'coral' : 'sky'}>
                  {txn.type}
                </Badge>
              </td>
              <td className="px-4 py-3 font-medium">
                {txn.type === 'spend' ? '−' : '+'}
                {txn.credits}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {txn.label}
                {txn.orderId ? ` · ${txn.orderId}` : ''}
              </td>
              <td className="px-4 py-3 text-sm">
                {txn.totalAed ? formatAed(txn.totalAed) : '—'}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      </>
      ) : null}
    </>
  );
}
