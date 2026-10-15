'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {
  getLeadPricing,
  isApiError,
  updateLeadPricing,
  type LeadPricingMode,
  type LeadPricingPayload,
  type SessionUser,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {useConfirm} from '@/components/ui/confirm';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {useToast} from '@/components/ui/toast';
import {cn} from '@/lib/cn';
import {can} from '@/lib/permissions';

const inputClass =
  'h-9 w-full max-w-[8rem] rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';

const FORMAT_LABELS: Record<string, string> = {
  coach: 'At coach location',
  client: 'At client location',
  online_live: 'Online live',
  online: 'Online (plans)',
};

const START_LABELS: Record<string, string> = {
  asap: 'As soon as possible',
  'next-week': 'Next week',
  'two-weeks': 'In two weeks',
  month: 'In a month',
  'few-months': 'In a few months',
  other: 'Other',
};

const FREQUENCY_LABELS: Record<string, string> = {
  '1-2': '1–2 times / week',
  '3-4': '3–4 times / week',
  '5+': '5+ times / week',
};

function parseCredits(raw: string, fallback: number): number {
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

/** Empty string = unset; otherwise a positive integer. */
function parseOptionalLimit(raw: string): number | null | 'invalid' {
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 1) return 'invalid';
  return Math.round(n);
}

function limitToInput(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

function cloneRows(rows: CreditRow[]): CreditRow[] {
  return rows.map(row => ({...row}));
}

type CreditRow = {id: string; label: string; credits: string};

type CreditLimitsDraft = {minCredits: string; maxCredits: string};

type FactorDraft = {
  services: CreditRow[];
  formats: CreditRow[];
  startTraining: CreditRow[];
  frequency: CreditRow[];
  minCredits: string;
  maxCredits: string;
};

function factorFromPayload(payload: LeadPricingPayload): FactorDraft {
  return {
    services: payload.services.map(s => ({
      id: s.id,
      label: s.name,
      credits: String(s.credits),
    })),
    formats: payload.meta.formatLeaves.map(row => ({
      id: row.id,
      label: FORMAT_LABELS[row.id] ?? row.id,
      credits: String(row.credits),
    })),
    startTraining: payload.meta.startTrainingOptions.map(row => ({
      id: row.id,
      label: START_LABELS[row.id] ?? row.id,
      credits: String(row.credits),
    })),
    frequency: payload.meta.frequencyOptions.map(row => ({
      id: row.id,
      label: FREQUENCY_LABELS[row.id] ?? row.id,
      credits: String(row.credits),
    })),
    minCredits: limitToInput(payload.config.factorBased.minCredits),
    maxCredits: limitToInput(payload.config.factorBased.maxCredits),
  };
}

function cloneFactor(draft: FactorDraft): FactorDraft {
  return {
    services: cloneRows(draft.services),
    formats: cloneRows(draft.formats),
    startTraining: cloneRows(draft.startTraining),
    frequency: cloneRows(draft.frequency),
    minCredits: draft.minCredits,
    maxCredits: draft.maxCredits,
  };
}

function validateLimits(limits: CreditLimitsDraft): string | null {
  const min = parseOptionalLimit(limits.minCredits);
  const max = parseOptionalLimit(limits.maxCredits);
  if (min === 'invalid') return 'Minimum lead credits must be a whole number of at least 1.';
  if (max === 'invalid') return 'Maximum lead credits must be a whole number of at least 1.';
  if (min != null && max != null && min > max) {
    return 'Minimum lead credits cannot exceed maximum lead credits.';
  }
  return null;
}

export function LeadPricingScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'credits:write');
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [savingFactor, setSavingFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LeadPricingMode>('match_scaled');
  const [openModes, setOpenModes] = useState<Record<LeadPricingMode, boolean>>({
    match_scaled: false,
    factor_based: false,
  });
  const [openSections, setOpenSections] = useState({
    services: false,
    formats: false,
    startTraining: false,
    frequency: false,
  });

  const [savedMatch, setSavedMatch] = useState({
    fullMatchCredits: '85',
    minCredits: '45',
    maxCredits: '85',
  });
  const [matchDraft, setMatchDraft] = useState({
    fullMatchCredits: '85',
    minCredits: '45',
    maxCredits: '85',
  });
  const [savedFactor, setSavedFactor] = useState<FactorDraft>({
    services: [],
    formats: [],
    startTraining: [],
    frequency: [],
    minCredits: '',
    maxCredits: '',
  });
  const [factor, setFactor] = useState<FactorDraft>({
    services: [],
    formats: [],
    startTraining: [],
    frequency: [],
    minCredits: '',
    maxCredits: '',
  });

  const applyPayload = (payload: LeadPricingPayload, options?: {collapse?: boolean}) => {
    setMode(payload.config.mode);
    const nextMatch = {
      fullMatchCredits: String(payload.config.matchScaled.fullMatchCredits),
      minCredits: limitToInput(payload.config.matchScaled.minCredits),
      maxCredits: limitToInput(payload.config.matchScaled.maxCredits),
    };
    setSavedMatch(nextMatch);
    setMatchDraft(nextMatch);
    const nextFactor = factorFromPayload(payload);
    setSavedFactor(cloneFactor(nextFactor));
    setFactor(cloneFactor(nextFactor));
    if (options?.collapse !== false) {
      setOpenModes({match_scaled: false, factor_based: false});
      setOpenSections({
        services: false,
        formats: false,
        startTraining: false,
        frequency: false,
      });
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      applyPayload(await getLeadPricing());
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load lead pricing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateFactorRow = (
    key: keyof FactorDraft,
    id: string,
    credits: string,
  ) => {
    setFactor(prev => ({
      ...prev,
      [key]: prev[key].map(row => (row.id === id ? {...row, credits} : row)),
    }));
  };

  const activateMode = async (next: LeadPricingMode) => {
    if (!canWrite || next === mode) return;
    const nextLabel =
      next === 'match_scaled' ? 'Percentage-Based Pricing' : 'Criteria-Based Pricing';
    const ok = await confirm({
      title: 'Switch pricing mode?',
      body: `Activate ${nextLabel}? This becomes the live unlock pricing for new lead unlocks.`,
      confirmLabel: 'Switch',
    });
    if (!ok) return;

    setActivating(true);
    setError(null);
    try {
      const payload = await updateLeadPricing({mode: next});
      setMode(payload.config.mode);
      setOpenModes(prev => ({...prev, [next]: true}));
      toast.success(`${nextLabel} activated`);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not activate pricing mode.');
    } finally {
      setActivating(false);
    }
  };

  const toggleAccordion = (id: LeadPricingMode) => {
    setOpenModes(prev => ({...prev, [id]: !prev[id]}));
  };

  const toggleSection = (id: keyof typeof openSections) => {
    setOpenSections(prev => ({...prev, [id]: !prev[id]}));
  };

  const matchDirty = JSON.stringify(matchDraft) !== JSON.stringify(savedMatch);
  const factorDirty = JSON.stringify(factor) !== JSON.stringify(savedFactor);

  const cancelMatch = () => {
    setMatchDraft(savedMatch);
    setError(null);
  };

  const saveMatch = async () => {
    if (!canWrite || !matchDirty) return;
    const full = parseCredits(matchDraft.fullMatchCredits, 50);
    if (full < 1) {
      setError('Full match credits must be at least 1.');
      return;
    }
    const limitsError = validateLimits(matchDraft);
    if (limitsError) {
      setError(limitsError);
      return;
    }
    const ok = await confirm();
    if (!ok) return;

    setSavingMatch(true);
    setError(null);
    try {
      const payload = await updateLeadPricing({
        matchScaled: {
          fullMatchCredits: full,
          minCredits: parseOptionalLimit(matchDraft.minCredits) as number | null,
          maxCredits: parseOptionalLimit(matchDraft.maxCredits) as number | null,
        },
      });
      const nextMatch = {
        fullMatchCredits: String(payload.config.matchScaled.fullMatchCredits),
        minCredits: limitToInput(payload.config.matchScaled.minCredits),
        maxCredits: limitToInput(payload.config.matchScaled.maxCredits),
      };
      setSavedMatch(nextMatch);
      setMatchDraft(nextMatch);
      setMode(payload.config.mode);
      toast.success('Percentage-Based Pricing settings saved');
    } catch (err) {
      setError(
        isApiError(err) ? err.message : 'Could not save Percentage-Based Pricing settings.',
      );
    } finally {
      setSavingMatch(false);
    }
  };

  const cancelFactor = () => {
    setFactor(cloneFactor(savedFactor));
    setError(null);
  };

  const saveFactor = async () => {
    if (!canWrite || !factorDirty) return;
    const limitsError = validateLimits(factor);
    if (limitsError) {
      setError(limitsError);
      return;
    }
    const ok = await confirm();
    if (!ok) return;

    setSavingFactor(true);
    setError(null);
    try {
      const payload = await updateLeadPricing({
        factorBased: {
          services: Object.fromEntries(
            factor.services.map(row => [row.id, parseCredits(row.credits, 50)]),
          ),
          formats: Object.fromEntries(
            factor.formats.map(row => [row.id, parseCredits(row.credits, 0)]),
          ),
          startTraining: Object.fromEntries(
            factor.startTraining.map(row => [row.id, parseCredits(row.credits, 0)]),
          ),
          frequency: Object.fromEntries(
            factor.frequency.map(row => [row.id, parseCredits(row.credits, 0)]),
          ),
          minCredits: parseOptionalLimit(factor.minCredits) as number | null,
          maxCredits: parseOptionalLimit(factor.maxCredits) as number | null,
        },
      });
      const nextFactor = factorFromPayload(payload);
      setSavedFactor(cloneFactor(nextFactor));
      setFactor(cloneFactor(nextFactor));
      setMode(payload.config.mode);
      toast.success('Criteria-Based Pricing settings saved');
    } catch (err) {
      setError(
        isApiError(err) ? err.message : 'Could not save Criteria-Based Pricing settings.',
      );
    } finally {
      setSavingFactor(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading lead pricing…" />;
  }

  if (error && savedFactor.services.length === 0) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Lead Pricings" />

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Pricing mode</h2>

        <div className="space-y-3">
          <ModeAccordion
            id="match_scaled"
            title="Percentage-Based Pricing"
            selected={mode === 'match_scaled'}
            open={openModes.match_scaled}
            canWrite={canWrite}
            activating={activating}
            onSelect={() => void activateMode('match_scaled')}
            onToggle={() => toggleAccordion('match_scaled')}>
            <CreditLimitsFields
              fullMatchCredits={matchDraft.fullMatchCredits}
              minCredits={matchDraft.minCredits}
              maxCredits={matchDraft.maxCredits}
              disabled={!canWrite || savingMatch}
              onChange={next => setMatchDraft(prev => ({...prev, ...next}))}
            />
            {canWrite ? (
              <SectionActions
                dirty={matchDirty}
                saving={savingMatch}
                onCancel={cancelMatch}
                onSave={() => void saveMatch()}
              />
            ) : null}
          </ModeAccordion>

          <ModeAccordion
            id="factor_based"
            title="Criteria-Based Pricing"
            selected={mode === 'factor_based'}
            open={openModes.factor_based}
            canWrite={canWrite}
            activating={activating}
            onSelect={() => void activateMode('factor_based')}
            onToggle={() => toggleAccordion('factor_based')}>
            <div className="space-y-3">
              <CreditLimitsFields
                minCredits={factor.minCredits}
                maxCredits={factor.maxCredits}
                disabled={!canWrite || savingFactor}
                onChange={next => setFactor(prev => ({...prev, ...next}))}
              />
              <CreditTable
                sectionId="services"
                title="Services"
                rows={factor.services}
                open={openSections.services}
                canWrite={canWrite && !savingFactor}
                onToggle={() => toggleSection('services')}
                onChange={(id, credits) => updateFactorRow('services', id, credits)}
              />
              <CreditTable
                sectionId="formats"
                title="Format"
                rows={factor.formats}
                open={openSections.formats}
                canWrite={canWrite && !savingFactor}
                onToggle={() => toggleSection('formats')}
                onChange={(id, credits) => updateFactorRow('formats', id, credits)}
              />
              <CreditTable
                sectionId="startTraining"
                title="Start timing"
                rows={factor.startTraining}
                open={openSections.startTraining}
                canWrite={canWrite && !savingFactor}
                onToggle={() => toggleSection('startTraining')}
                onChange={(id, credits) => updateFactorRow('startTraining', id, credits)}
              />
              <CreditTable
                sectionId="frequency"
                title="Frequency"
                rows={factor.frequency}
                open={openSections.frequency}
                canWrite={canWrite && !savingFactor}
                onToggle={() => toggleSection('frequency')}
                onChange={(id, credits) => updateFactorRow('frequency', id, credits)}
              />
            </div>
            {canWrite ? (
              <SectionActions
                dirty={factorDirty}
                saving={savingFactor}
                onCancel={cancelFactor}
                onSave={() => void saveFactor()}
              />
            ) : null}
          </ModeAccordion>
        </div>
      </section>
    </div>
  );
}

type LimitsTableDraft = CreditLimitsDraft & {fullMatchCredits?: string};

function CreditLimitsFields({
  fullMatchCredits,
  minCredits,
  maxCredits,
  disabled,
  onChange,
}: {
  fullMatchCredits?: string;
  minCredits: string;
  maxCredits: string;
  disabled?: boolean;
  onChange: (next: LimitsTableDraft) => void;
}) {
  const rows: Array<{
    id: 'fullMatchCredits' | 'minCredits' | 'maxCredits';
    label: string;
    value: string;
    placeholder?: string;
  }> = [
    ...(fullMatchCredits !== undefined
      ? [
          {
            id: 'fullMatchCredits' as const,
            label: 'Full match credits (100%)',
            value: fullMatchCredits,
          },
        ]
      : []),
    {
      id: 'minCredits',
      label: 'Minimum credits limit',
      value: minCredits,
      placeholder: 'None',
    },
    {
      id: 'maxCredits',
      label: 'Maximum credits limit',
      value: maxCredits,
      placeholder: 'None',
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Option</th>
            <th className="w-36 px-4 py-2.5 font-medium">Credits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-2.5 text-foreground">{row.label}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={1}
                  placeholder={row.placeholder}
                  className={inputClass}
                  value={row.value}
                  disabled={disabled}
                  aria-label={row.label}
                  onChange={e =>
                    onChange({
                      ...(fullMatchCredits !== undefined
                        ? {
                            fullMatchCredits:
                              row.id === 'fullMatchCredits'
                                ? e.target.value
                                : fullMatchCredits,
                          }
                        : {}),
                      minCredits: row.id === 'minCredits' ? e.target.value : minCredits,
                      maxCredits: row.id === 'maxCredits' ? e.target.value : maxCredits,
                    })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionActions({
  dirty,
  saving,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/80 pt-4">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={saving || !dirty}
        onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" size="sm" disabled={saving || !dirty} onClick={onSave}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

function ModeAccordion({
  id,
  title,
  selected,
  open,
  canWrite,
  activating,
  onSelect,
  onToggle,
  children,
}: {
  id: LeadPricingMode;
  title: string;
  selected: boolean;
  open: boolean;
  canWrite: boolean;
  activating: boolean;
  onSelect: () => void;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `lead-pricing-${id}-panel`;
  const headerId = `lead-pricing-${id}-header`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card',
      )}>
      <div className="flex items-stretch gap-2 px-3 py-2.5 sm:px-4">
        <label
          className={cn(
            'flex shrink-0 items-center self-center',
            canWrite && !activating ? 'cursor-pointer' : 'cursor-default opacity-80',
          )}>
          <span className="sr-only">Activate {title}</span>
          <input
            type="radio"
            name="lead-pricing-mode"
            checked={selected}
            disabled={!canWrite || activating}
            onChange={onSelect}
          />
        </label>
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {selected ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                Active
              </span>
            ) : null}
          </span>
          <ChevronDown
            size={18}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </div>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-border/80 bg-background/80 px-4 py-4 sm:px-5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CreditTable({
  sectionId,
  title,
  rows,
  open,
  canWrite,
  onToggle,
  onChange,
}: {
  sectionId: string;
  title: string;
  rows: CreditRow[];
  open: boolean;
  canWrite: boolean;
  onToggle: () => void;
  onChange: (id: string, credits: string) => void;
}) {
  const panelId = `lead-pricing-section-${sectionId}-panel`;
  const headerId = `lead-pricing-section-${sectionId}-header`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-4">
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-border px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Option</th>
                  <th className="w-36 px-4 py-2.5 font-medium">Credits</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-foreground">{row.label}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className={inputClass}
                        value={row.credits}
                        disabled={!canWrite}
                        onChange={e => onChange(row.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
