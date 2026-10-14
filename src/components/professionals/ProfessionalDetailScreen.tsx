'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Hash,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Shield,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  createProfessionalNote,
  deleteProfessionalNote,
  fetchVerificationFileBlob,
  getProfessional,
  isApiError,
  listLeads,
  listProfessionalWalletTransactions,
  listServices,
  updateProfessional,
  updateProfessionalNote,
  type CatalogService,
  type LeadLifecycleStatus,
  type LeadSummary,
  type Professional,
  type ProfessionalAdminNote,
  type ProfessionalTxn,
  type ProfileCompletionPayload,
  type SessionUser,
  type VerificationFile,
  type WalletTxnSortBy,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {
  ExcelColumnFilter,
  ExcelFilterMultiSelect,
  ExcelFilterTextField,
} from '@/components/ui/ExcelColumnFilter';
import {FileViewerModal} from '@/components/ui/FileViewerModal';
import {Input} from '@/components/ui/Input';
import {LoadingState} from '@/components/ui/LoadingState';
import {PaginationBar} from '@/components/ui/PaginationBar';
import {NotificationPrefsPanel} from '@/components/support/NotificationPrefsPanel';
import {
  creditTxnLabel,
  creditTxnTypeLabel,
  formatAed,
} from '@/lib/credit-utils';
import {leadPreferenceDisplay} from '@/lib/lead-preference-labels';
import {formatPostedAt} from '@/lib/lead-utils';
import {
  DEFAULT_PER_PAGE,
  emptyPaginationMeta,
  type PaginationMeta,
} from '@/lib/pagination';
import {ActivityTimeline} from '@/components/activity/ActivityTimeline';
import {can} from '@/lib/permissions';
import {
  coachLeadPrefRows,
  coachLeadPrefsEmpty,
  formatCoachYearsExperience,
  verificationLabels,
} from '@/lib/professional-utils';

function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </Card>
  );
}

type WalletFilterKey =
  | 'id'
  | 'date'
  | 'source'
  | 'types'
  | 'credits'
  | 'paid'
  | 'reference'
  | 'payments';

type WalletColumnFilters = {
  id: string;
  source: string;
  types: string[];
  createdFrom: string;
  createdTo: string;
  creditsMin: string;
  creditsMax: string;
  paidMin: string;
  paidMax: string;
  reference: string;
  payments: string[];
};

const EMPTY_WALLET_FILTERS: WalletColumnFilters = {
  id: '',
  source: '',
  types: [],
  createdFrom: '',
  createdTo: '',
  creditsMin: '',
  creditsMax: '',
  paidMin: '',
  paidMax: '',
  reference: '',
  payments: [],
};

const WALLET_COLUMN_SORT_BY: Record<WalletFilterKey, WalletTxnSortBy> = {
  id: 'id',
  source: 'source',
  types: 'type',
  credits: 'credits',
  paid: 'paid',
  reference: 'reference',
  payments: 'payment',
  date: 'date',
};

const DEFAULT_WALLET_SORT_BY: WalletTxnSortBy = 'date';
const DEFAULT_WALLET_SORT_DIR: 'asc' | 'desc' = 'desc';

const WALLET_TYPE_OPTIONS = [
  {value: 'purchase', label: 'Purchase'},
  {value: 'membership_grant', label: 'Membership'},
  {value: 'spend', label: 'Spend'},
];

const WALLET_PAYMENT_OPTIONS = [
  {value: 'completed', label: 'Completed'},
  {value: 'test', label: 'Test'},
  {value: 'none', label: 'No payment'},
];

const WALLET_CHIP_LABELS: Record<WalletFilterKey, string> = {
  id: 'ID',
  date: 'When',
  source: 'Details',
  types: 'Type',
  credits: 'Credits',
  paid: 'Paid',
  reference: 'Reference',
  payments: 'Payment',
};

function isWalletColumnActive(
  filters: WalletColumnFilters,
  key: WalletFilterKey,
): boolean {
  switch (key) {
    case 'id':
      return Boolean(filters.id.trim());
    case 'date':
      return Boolean(filters.createdFrom.trim() || filters.createdTo.trim());
    case 'credits':
      return Boolean(filters.creditsMin.trim() || filters.creditsMax.trim());
    case 'paid':
      return Boolean(filters.paidMin.trim() || filters.paidMax.trim());
    case 'types':
      return filters.types.length > 0;
    case 'payments':
      return filters.payments.length > 0;
    case 'source':
      return Boolean(filters.source.trim());
    case 'reference':
      return Boolean(filters.reference.trim());
    default:
      return false;
  }
}

function clearedWalletColumnSlice(
  key: WalletFilterKey,
): Partial<WalletColumnFilters> {
  if (key === 'id') return {id: ''};
  if (key === 'date') return {createdFrom: '', createdTo: ''};
  if (key === 'credits') return {creditsMin: '', creditsMax: ''};
  if (key === 'paid') return {paidMin: '', paidMax: ''};
  if (key === 'types') return {types: []};
  if (key === 'payments') return {payments: []};
  if (key === 'source') return {source: ''};
  if (key === 'reference') return {reference: ''};
  return {};
}

function walletFilterChips(
  filters: WalletColumnFilters,
): Array<{key: WalletFilterKey; text: string}> {
  const chips: Array<{key: WalletFilterKey; text: string}> = [];
  if (filters.id.trim()) {
    chips.push({
      key: 'id',
      text: `${WALLET_CHIP_LABELS.id}: ${filters.id.trim()}`,
    });
  }
  if (filters.createdFrom.trim() || filters.createdTo.trim()) {
    const from = filters.createdFrom.trim() || '…';
    const to = filters.createdTo.trim() || '…';
    chips.push({key: 'date', text: `${WALLET_CHIP_LABELS.date}: ${from} → ${to}`});
  }
  if (filters.source.trim()) {
    chips.push({
      key: 'source',
      text: `${WALLET_CHIP_LABELS.source}: ${filters.source.trim()}`,
    });
  }
  if (filters.types.length) {
    chips.push({
      key: 'types',
      text: `${WALLET_CHIP_LABELS.types}: ${filters.types
        .map(t => WALLET_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t)
        .join(', ')}`,
    });
  }
  if (filters.creditsMin.trim() || filters.creditsMax.trim()) {
    const min = filters.creditsMin.trim() || '…';
    const max = filters.creditsMax.trim() || '…';
    chips.push({
      key: 'credits',
      text: `${WALLET_CHIP_LABELS.credits}: ${min} – ${max}`,
    });
  }
  if (filters.paidMin.trim() || filters.paidMax.trim()) {
    const min = filters.paidMin.trim() || '…';
    const max = filters.paidMax.trim() || '…';
    chips.push({
      key: 'paid',
      text: `${WALLET_CHIP_LABELS.paid}: ${min} – ${max}`,
    });
  }
  if (filters.reference.trim()) {
    chips.push({
      key: 'reference',
      text: `${WALLET_CHIP_LABELS.reference}: ${filters.reference.trim()}`,
    });
  }
  if (filters.payments.length) {
    chips.push({
      key: 'payments',
      text: `${WALLET_CHIP_LABELS.payments}: ${filters.payments
        .map(p => WALLET_PAYMENT_OPTIONS.find(o => o.value === p)?.label ?? p)
        .join(', ')}`,
    });
  }
  return chips;
}

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
      <div className="mt-1 text-sm font-medium text-foreground">{value ?? '—'}</div>
    </div>
  );
}

function ContactValue({value, verified}: {value: string; verified?: boolean}) {
  const display = value.trim();
  if (!display) {
    return <span className="font-normal text-muted-foreground">{'\u2014'}</span>;
  }
  return (
    <span>
      <span className="break-all">{display}</span>
      {verified === false ? (
        <span className="ms-1.5 whitespace-nowrap text-xs font-normal text-muted-foreground">
          (unverified)
        </span>
      ) : null}
    </span>
  );
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '\u2014';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '\u2014';
  return date.toLocaleString();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '\u2014';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '\u2014';
  return date.toLocaleDateString();
}

/** Date + time on two lines (e.g. 10/9/2026 / 4:11:18 PM). */
function formatWhenParts(
  iso: string | null | undefined,
): {date: string; time: string} | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    date: date.toLocaleDateString('en-US'),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  };
}

/** YYYY-MM-DD for `<input type="date">` from an ISO datetime. */
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function resolvedLeadStatus(row: LeadSummary): LeadLifecycleStatus {
  if (row.leadStatus) {
    return row.leadStatus;
  }
  return row.status === 'closed' ? 'cancelled' : 'open';
}

function leadStatusTone(status: LeadLifecycleStatus) {
  if (status === 'in_progress') return 'primary' as const;
  if (status === 'completed') return 'muted' as const;
  if (status === 'cancelled' || status === 'deleted') return 'danger' as const;
  return 'sky' as const;
}

function leadStatusLabel(status: LeadLifecycleStatus) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'deleted') return 'Deleted';
  return 'Open';
}

function LeadCell({value, className}: {value: string; className?: string}) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-foreground ${className ?? ''}`}>
      {value}
    </td>
  );
}

function verificationTone(status: Professional['verificationStatus']) {
  if (status === 'verified') return 'primary' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'muted' as const;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  reps_uae: 'REPs UAE',
  muahal: "Mu'Ahal",
  ministry_or_federation: 'Ministry / federation',
  cpr_aed: 'CPR / AED',
  insurance: 'Insurance',
  additional_certs: 'Additional certifications',
  trade_licence: 'Trade licence',
};

const DOC_TYPE_TAGLINES: Record<string, string> = {
  reps_uae: 'Valid REPs UAE registration certificate.',
  muahal: "Mu'Ahal professional qualification approval.",
  ministry_or_federation:
    'Ministry of Sports licence or federation approval.',
  cpr_aed: 'Current CPR/AED certification.',
  insurance: 'Professional liability or related insurance.',
  additional_certs: 'Specialty or other supporting certifications.',
  trade_licence: 'Commercial or trade licence, if applicable.',
};

function docTypeLabel(file: VerificationFile) {
  if (!file.docType) return 'Untyped';
  return DOC_TYPE_LABELS[file.docType] ?? file.docType;
}

function docTypeTagline(file: VerificationFile) {
  if (!file.docType) return null;
  return DOC_TYPE_TAGLINES[file.docType] ?? null;
}

function docStatusTone(status?: string) {
  if (status === 'approved' || status === 'expiring_soon') return 'primary' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'under_review') return 'sky' as const;
  return 'muted' as const;
}

function docStatusLabel(status?: string) {
  return String(status ?? 'submitted').replace(/_/g, ' ');
}

const COMPLETION_SECTION_LABELS: Record<string, string> = {
  about: 'About',
  verification: 'Verification',
  activated: 'Activated',
};

const COMPLETION_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  bio: 'Bio',
  years: 'Years experience',
  emailVerified: 'Email verified',
  phoneVerified: 'Phone verified',
  reps_uae: 'REPs UAE',
  muahal: 'Muahal',
  ministry_or_federation: 'Ministry / federation',
  live: 'Live profile',
};

/** Checklist without prefs/pricing/credits - shown elsewhere or not needed here. */
function completionItems(
  value: Professional['profileCompletion'],
): ProfileCompletionPayload['items'] {
  if (!value || typeof value === 'number') {
    return [];
  }
  const items = Array.isArray(value.items) ? value.items : [];
  return items.filter(
    section =>
      section.id !== 'prefs' &&
      section.id !== 'pricing' &&
      section.id !== 'credits',
  );
}

function checklistPercent(items: ProfileCompletionPayload['items']): number {
  const fields = items.flatMap(section => section.fields ?? []);
  if (fields.length === 0) return 0;
  return Math.round((fields.filter(field => field.done).length / fields.length) * 100);
}

export function ProfessionalDetailScreen({
  actor,
  id,
}: {
  actor: SessionUser;
  id: string;
}) {
  const canWrite = can(actor, 'professionals:write');
  const [pro, setPro] = useState<Professional | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingActivate, setPendingActivate] = useState<boolean | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<boolean | null>(null);
  const [acting, setActing] = useState(false);
  const [viewer, setViewer] = useState<{fileId: string; name: string} | null>(null);
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteFollowUp, setNewNoteFollowUp] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState('');
  const [editNoteFollowUp, setEditNoteFollowUp] = useState('');
  const [noteActing, setNoteActing] = useState(false);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<string | null>(null);
  const [walletTxns, setWalletTxns] = useState<ProfessionalTxn[]>([]);
  const [walletMeta, setWalletMeta] = useState<PaginationMeta>(
    emptyPaginationMeta(1, DEFAULT_PER_PAGE),
  );
  const [walletPage, setWalletPage] = useState(1);
  const [walletPerPage, setWalletPerPage] = useState(DEFAULT_PER_PAGE);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletAppliedFilters, setWalletAppliedFilters] =
    useState<WalletColumnFilters>(EMPTY_WALLET_FILTERS);
  const [walletDraftFilters, setWalletDraftFilters] =
    useState<WalletColumnFilters>(EMPTY_WALLET_FILTERS);
  const [walletOpenFilter, setWalletOpenFilter] = useState<WalletFilterKey | null>(
    null,
  );
  const [walletSortBy, setWalletSortBy] =
    useState<WalletTxnSortBy>(DEFAULT_WALLET_SORT_BY);
  const [walletSortDir, setWalletSortDir] = useState<'asc' | 'desc'>(
    DEFAULT_WALLET_SORT_DIR,
  );

  const loadViewerFile = useCallback(async () => {
    if (!viewer) {
      throw new Error('Unable to open file.');
    }
    return fetchVerificationFileBlob(id, viewer.fileId);
  }, [id, viewer]);

  const walletFilterParams = useMemo(
    () => ({
      id: walletAppliedFilters.id.trim() || undefined,
      type: walletAppliedFilters.types.length
        ? walletAppliedFilters.types
        : undefined,
      payment: walletAppliedFilters.payments.length
        ? walletAppliedFilters.payments
        : undefined,
      createdFrom: walletAppliedFilters.createdFrom.trim() || undefined,
      createdTo: walletAppliedFilters.createdTo.trim() || undefined,
      q: walletAppliedFilters.source.trim() || undefined,
      reference: walletAppliedFilters.reference.trim() || undefined,
      creditsMin: walletAppliedFilters.creditsMin.trim() || undefined,
      creditsMax: walletAppliedFilters.creditsMax.trim() || undefined,
      paidMin: walletAppliedFilters.paidMin.trim() || undefined,
      paidMax: walletAppliedFilters.paidMax.trim() || undefined,
      sortBy: walletSortBy,
      sortDir: walletSortDir,
    }),
    [walletAppliedFilters, walletSortBy, walletSortDir],
  );

  const loadWallet = useCallback(
    async (nextPage: number, nextPerPage: number) => {
      setWalletLoading(true);
      setWalletError(null);
      try {
        const res = await listProfessionalWalletTransactions(id, {
          page: nextPage,
          perPage: nextPerPage,
          ...walletFilterParams,
        });
        setWalletTxns(res.data);
        setWalletMeta(res.meta);
        setWalletPage(res.meta.page);
        setWalletPerPage(res.meta.perPage);
      } catch (err) {
        setWalletError(
          isApiError(err) ? err.message : 'Could not load wallet history.',
        );
      } finally {
        setWalletLoading(false);
      }
    },
    [id, walletFilterParams],
  );

  const clearWalletFilters = () => {
    setWalletAppliedFilters(EMPTY_WALLET_FILTERS);
    setWalletDraftFilters(EMPTY_WALLET_FILTERS);
    setWalletOpenFilter(null);
    setWalletPage(1);
  };

  const applyWalletSort = (key: WalletFilterKey, dir: 'asc' | 'desc') => {
    const nextBy = WALLET_COLUMN_SORT_BY[key];
    if (walletSortBy === nextBy && walletSortDir === dir) {
      setWalletSortBy(DEFAULT_WALLET_SORT_BY);
      setWalletSortDir(DEFAULT_WALLET_SORT_DIR);
    } else {
      setWalletSortBy(nextBy);
      setWalletSortDir(dir);
    }
    setWalletPage(1);
  };

  const walletChips = useMemo(
    () => walletFilterChips(walletAppliedFilters),
    [walletAppliedFilters],
  );

  const patchWalletDraft = <K extends keyof WalletColumnFilters>(
    key: K,
    value: WalletColumnFilters[K],
  ) => {
    setWalletDraftFilters(prev => ({...prev, [key]: value}));
  };

  const openWalletColumnMenu = (key: WalletFilterKey) => {
    setWalletDraftFilters(walletAppliedFilters);
    setWalletOpenFilter(key);
  };

  const applyWalletColumnDraft = () => {
    setWalletAppliedFilters(walletDraftFilters);
    setWalletPage(1);
  };

  const commitWalletMultiSelect = (
    key: 'types' | 'payments',
    values: string[],
  ) => {
    setWalletDraftFilters(prev => ({...prev, [key]: values}));
    setWalletAppliedFilters(prev => ({...prev, [key]: values}));
    setWalletPage(1);
  };

  const clearOneWalletColumn = (key: WalletFilterKey) => {
    const slice = clearedWalletColumnSlice(key);
    setWalletAppliedFilters(prev => ({...prev, ...slice}));
    setWalletDraftFilters(prev => ({...prev, ...slice}));
    setWalletPage(1);
  };

  const walletHeader = (
    key: WalletFilterKey,
    label: string,
    body: ReactNode,
  ) => {
    const sortKey = WALLET_COLUMN_SORT_BY[key];
    return (
      <ExcelColumnFilter
        label={label}
        active={isWalletColumnActive(walletAppliedFilters, key)}
        sortDirection={walletSortBy === sortKey ? walletSortDir : null}
        open={walletOpenFilter === key}
        onOpenChange={next => {
          if (next) openWalletColumnMenu(key);
          else setWalletOpenFilter(null);
        }}
        onClear={() => clearOneWalletColumn(key)}
        onApply={applyWalletColumnDraft}
        onSortAsc={() => applyWalletSort(key, 'asc')}
        onSortDesc={() => applyWalletSort(key, 'desc')}
        sortAscLabel="Ascending"
        sortDescLabel="Descending">
        {body}
      </ExcelColumnFilter>
    );
  };

  const walletColumns = [
    walletHeader(
      'id',
      'ID',
      <ExcelFilterTextField
        label="Search"
        value={walletDraftFilters.id}
        onChange={v => patchWalletDraft('id', v)}
        autoFocus
      />,
    ),
    walletHeader(
      'types',
      'Type',
      <ExcelFilterMultiSelect
        values={walletDraftFilters.types}
        onChange={v => commitWalletMultiSelect('types', v)}
        options={WALLET_TYPE_OPTIONS}
      />,
    ),
    walletHeader(
      'credits',
      'Credits',
      <>
        <ExcelFilterTextField
          type="number"
          label="Min"
          value={walletDraftFilters.creditsMin}
          onChange={v => patchWalletDraft('creditsMin', v)}
          placeholder="0"
        />
        <ExcelFilterTextField
          type="number"
          label="Max"
          value={walletDraftFilters.creditsMax}
          onChange={v => patchWalletDraft('creditsMax', v)}
          placeholder="∞"
        />
      </>,
    ),
    walletHeader(
      'paid',
      'Paid',
      <>
        <ExcelFilterTextField
          type="number"
          label="Min"
          value={walletDraftFilters.paidMin}
          onChange={v => patchWalletDraft('paidMin', v)}
          placeholder="0"
        />
        <ExcelFilterTextField
          type="number"
          label="Max"
          value={walletDraftFilters.paidMax}
          onChange={v => patchWalletDraft('paidMax', v)}
          placeholder="∞"
        />
      </>,
    ),
    walletHeader(
      'source',
      'Details',
      <ExcelFilterTextField
        label="Search"
        value={walletDraftFilters.source}
        onChange={v => patchWalletDraft('source', v)}
        autoFocus
      />,
    ),
    walletHeader(
      'reference',
      'Reference',
      <ExcelFilterTextField
        label="Search"
        value={walletDraftFilters.reference}
        onChange={v => patchWalletDraft('reference', v)}
        autoFocus
      />,
    ),
    walletHeader(
      'payments',
      'Payment',
      <ExcelFilterMultiSelect
        values={walletDraftFilters.payments}
        onChange={v => commitWalletMultiSelect('payments', v)}
        options={WALLET_PAYMENT_OPTIONS}
      />,
    ),
    walletHeader(
      'date',
      'When',
      <>
        <ExcelFilterTextField
          type="date"
          label="From"
          value={walletDraftFilters.createdFrom}
          onChange={v => patchWalletDraft('createdFrom', v)}
        />
        <ExcelFilterTextField
          type="date"
          label="To"
          value={walletDraftFilters.createdTo}
          onChange={v => patchWalletDraft('createdTo', v)}
        />
      </>,
    ),
  ];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, catalog, allLeads] = await Promise.all([
        getProfessional(id),
        listServices(),
        listLeads({assignedCoachId: id, perPage: 100}),
      ]);
      setPro(detail);
      setServices(catalog);
      setLeads(allLeads.data);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load professional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    setWalletPage(1);
    setWalletPerPage(DEFAULT_PER_PAGE);
    setWalletAppliedFilters(EMPTY_WALLET_FILTERS);
    setWalletDraftFilters(EMPTY_WALLET_FILTERS);
    setWalletOpenFilter(null);
    setWalletSortBy(DEFAULT_WALLET_SORT_BY);
    setWalletSortDir(DEFAULT_WALLET_SORT_DIR);
  }, [id]);

  useEffect(() => {
    setWalletPage(1);
  }, [walletFilterParams]);

  useEffect(() => {
    void loadWallet(walletPage, walletPerPage);
  }, [walletPage, walletPerPage, loadWallet]);

  const notes = useMemo(
    () => (pro?.notes ?? []) as ProfessionalAdminNote[],
    [pro?.notes],
  );

  const setNotesOnPro = (next: ProfessionalAdminNote[]) => {
    setPro(prev => (prev ? {...prev, notes: next} : prev));
  };

  const serviceNameById = useMemo(
    () => new Map(services.map(item => [item.id, item.name])),
    [services],
  );

  const coachLeads = useMemo(() => {
    if (!pro) return [];
    const coachKey = String(pro.id);
    return leads.filter(lead => String(lead.assignedCoachId) === coachKey);
  }, [pro, leads]);

  const toggleActivated = async () => {
    if (!pro || pendingActivate === null) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      const updated = await updateProfessional(pro.id, {activated: pendingActivate});
      setPro(updated);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update activation.');
    } finally {
      setPendingActivate(null);
      setActing(false);
    }
  };

  const toggleSuspended = async () => {
    if (!pro || pendingSuspend === null) {
      return;
    }
    setActing(true);
    setError(null);
    try {
      const updated = await updateProfessional(pro.id, {suspended: pendingSuspend});
      setPro(updated);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update suspension.');
    } finally {
      setPendingSuspend(null);
      setActing(false);
    }
  };

  const addNote = async () => {
    if (!pro || !canWrite || !newNoteBody.trim()) return;
    setNoteActing(true);
    setError(null);
    try {
      const created = await createProfessionalNote(pro.id, {
        body: newNoteBody.trim(),
        followUpAt: newNoteFollowUp,
      });
      setNotesOnPro([created, ...notes]);
      setNewNoteBody('');
      setNewNoteFollowUp('');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not add note.');
    } finally {
      setNoteActing(false);
    }
  };

  const startEditNote = (note: ProfessionalAdminNote) => {
    setEditingNoteId(note.id);
    setEditNoteBody(note.body);
    setEditNoteFollowUp(toDateInputValue(note.followUpAt));
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteBody('');
    setEditNoteFollowUp('');
  };

  const saveEditNote = async () => {
    if (!pro || !canWrite || !editingNoteId || !editNoteBody.trim()) return;
    setNoteActing(true);
    setError(null);
    try {
      const updated = await updateProfessionalNote(pro.id, editingNoteId, {
        body: editNoteBody.trim(),
        followUpAt: editNoteFollowUp,
      });
      setNotesOnPro(notes.map(n => (n.id === updated.id ? updated : n)));
      cancelEditNote();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update note.');
    } finally {
      setNoteActing(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!pro || !canWrite || !pendingDeleteNoteId) return;
    setNoteActing(true);
    setError(null);
    try {
      await deleteProfessionalNote(pro.id, pendingDeleteNoteId);
      setNotesOnPro(notes.filter(n => n.id !== pendingDeleteNoteId));
      if (editingNoteId === pendingDeleteNoteId) {
        cancelEditNote();
      }
      setPendingDeleteNoteId(null);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not delete note.');
      setPendingDeleteNoteId(null);
    } finally {
      setNoteActing(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading professional..." />;
  }

  if (error && !pro) {
    return (
      <ErrorState
        body={error ?? 'Professional not found.'}
        onRetry={() => void load()}
      />
    );
  }

  if (!pro) {
    return (
      <ErrorState body="Professional not found." onRetry={() => void load()} />
    );
  }

  const checklist = completionItems(pro.profileCompletion);
  const pct = checklistPercent(checklist);
  const leadPrefRows = coachLeadPrefRows(pro, serviceNameById);
  const leadPrefsEmpty = coachLeadPrefsEmpty(pro, serviceNameById);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/professionals"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to professionals
        </Link>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <>
              {!pro.deletedAt ? (
                <Button
                  variant={pro.suspended ? 'primary' : 'destructive'}
                  size="sm"
                  disabled={acting}
                  onClick={() => setPendingSuspend(!pro.suspended)}>
                  {pro.suspended ? 'Unsuspend' : 'Suspend'}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => setPendingActivate(!pro.activated)}>
                {pro.activated ? 'Deactivate' : 'Activate'}
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void load();
              void loadWallet(walletPage, walletPerPage);
            }}
            disabled={acting || walletLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Profile">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PrefField
              icon={<Hash className="size-3.5" strokeWidth={1.8} />}
              label="ID"
              value={pro.id}
            />
            <PrefField
              icon={<UserRound className="size-3.5" strokeWidth={1.8} />}
              label="Name"
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{pro.name}</span>
                  {pro.isFoundingProfessional ? (
                    <Badge tone="coral">Founding</Badge>
                  ) : null}
                </span>
              }
            />
            <PrefField
              icon={<Mail className="size-3.5" strokeWidth={1.8} />}
              label="Email"
              value={
                <ContactValue
                  value={pro.email}
                  verified={pro.emailVerified}
                />
              }
            />
            <PrefField
              icon={<Phone className="size-3.5" strokeWidth={1.8} />}
              label="Phone"
              value={
                <ContactValue
                  value={pro.phone}
                  verified={pro.phoneVerified}
                />
              }
            />
            <PrefField
              icon={<UserRound className="size-3.5" strokeWidth={1.8} />}
              label="Gender"
              value={pro.gender === 'female' ? 'Female' : 'Male'}
            />
            <PrefField
              icon={<Briefcase className="size-3.5" strokeWidth={1.8} />}
              label="Experience"
              value={formatCoachYearsExperience(
                pro.yearsExperience ?? pro.years,
              )}
            />
            <PrefField
              icon={<MapPin className="size-3.5" strokeWidth={1.8} />}
              label="Location"
              value={pro.location?.trim() || '\u2014'}
            />
          </div>
          {pro.about?.trim() || pro.bio?.trim() ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {pro.about?.trim() || pro.bio?.trim()}
            </p>
          ) : null}
        </Section>

        <Section title="Account">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PrefField
              icon={<Shield className="size-3.5" strokeWidth={1.8} />}
              label="Status"
              value={
                pro.deletedAt ? (
                  <Badge tone="danger">Deleted</Badge>
                ) : pro.suspended ? (
                  <Badge tone="danger">Suspended</Badge>
                ) : (
                  <Badge tone="primary">Active</Badge>
                )
              }
            />
            <PrefField
              icon={<Shield className="size-3.5" strokeWidth={1.8} />}
              label="Founding"
              value={
                pro.isFoundingProfessional ? (
                  <Badge tone="coral">Founding professional</Badge>
                ) : (
                  <Badge tone="muted">No</Badge>
                )
              }
            />
            <PrefField
              icon={<ClipboardCheck className="size-3.5" strokeWidth={1.8} />}
              label="Onboarding"
              value={
                pro.onboarded ? (
                  <Badge tone="primary">Complete</Badge>
                ) : (
                  <Badge tone="warning">Incomplete</Badge>
                )
              }
            />
            <PrefField
              icon={<ClipboardCheck className="size-3.5" strokeWidth={1.8} />}
              label="Verification"
              value={
                <Badge tone={verificationTone(pro.verificationStatus)}>
                  {verificationLabels[pro.verificationStatus]}
                </Badge>
              }
            />
            <PrefField
              icon={<Shield className="size-3.5" strokeWidth={1.8} />}
              label="Marketplace"
              value={
                pro.activated ? (
                  <Badge tone="primary">Live</Badge>
                ) : (
                  <Badge tone="muted">Off</Badge>
                )
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Joined"
              value={
                <span className="break-words">{formatDateTime(pro.createdAt)}</span>
              }
            />
            <PrefField
              icon={<CalendarDays className="size-3.5" strokeWidth={1.8} />}
              label="Last active"
              value={
                <span className="break-words">
                  {formatDateTime(pro.lastActiveAt)}
                </span>
              }
            />
            <PrefField
              icon={<Wallet className="size-3.5" strokeWidth={1.8} />}
              label="Credits"
              value={pro.credits}
            />
          </div>
          {pro.verificationStatus === 'rejected' &&
          pro.verificationRejectedReason ? (
            <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Rejected: {pro.verificationRejectedReason}
            </p>
          ) : null}
        </Section>

        <Section title="Profile completion">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{width: `${pct}%`}}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
          {checklist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist data.</p>
          ) : (
            <div className="space-y-4">
              {checklist.map(section => {
                const fields = section.fields ?? [];
                return (
                  <div key={section.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {COMPLETION_SECTION_LABELS[section.id] ?? section.id}
                      </p>
                      <Badge tone={section.done ? 'primary' : 'muted'}>
                        {section.done ? 'Done' : 'Incomplete'}
                      </Badge>
                    </div>
                    <ul className="space-y-2">
                      {fields.map(field => (
                        <li
                          key={field.id}
                          className="flex items-center gap-2.5 text-sm">
                          {field.done ? (
                            <CheckCircle2
                              className="size-4 shrink-0 text-primary"
                              strokeWidth={2}
                            />
                          ) : (
                            <Circle
                              className="size-4 shrink-0 text-muted-foreground"
                              strokeWidth={1.8}
                            />
                          )}
                          <span
                            className={
                              field.done
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }>
                            {COMPLETION_FIELD_LABELS[field.id] ?? field.id}
                            {field.optional ? (
                              <span className="ms-1 text-xs text-muted-foreground">
                                (optional)
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Notifications">
          <NotificationPrefsPanel prefs={pro.notificationPrefs} />
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Notes">
          <div className="space-y-4">
            {canWrite ? (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                <label
                  className="block text-sm font-medium text-foreground"
                  htmlFor="admin-note-new">
                  Add note
                  <textarea
                    id="admin-note-new"
                    rows={3}
                    maxLength={5000}
                    value={newNoteBody}
                    onChange={e => setNewNoteBody(e.target.value)}
                    placeholder="Call notes, next steps, context…"
                    className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-primary"
                  />
                </label>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="max-w-xs flex-1">
                    <Input
                      label="Follow-up date"
                      type="date"
                      value={newNoteFollowUp}
                      onChange={e => setNewNoteFollowUp(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={noteActing || !newNoteBody.trim()}
                    onClick={() => void addNote()}>
                    {noteActing && !editingNoteId ? 'Adding…' : 'Add note'}
                  </Button>
                </div>
              </div>
            ) : null}

            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map(note => {
                  const isEditing = editingNoteId === note.id;
                  return (
                    <li
                      key={note.id}
                      className="rounded-xl border border-border bg-background p-3 sm:p-4">
                      {isEditing ? (
                        <div className="space-y-3">
                          <label
                            className="block text-sm font-medium text-foreground"
                            htmlFor={`admin-note-edit-${note.id}`}>
                            Edit note
                            <textarea
                              id={`admin-note-edit-${note.id}`}
                              rows={3}
                              maxLength={5000}
                              value={editNoteBody}
                              onChange={e => setEditNoteBody(e.target.value)}
                              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal outline-none focus:border-primary"
                            />
                          </label>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="max-w-xs flex-1">
                              <Input
                                label="Follow-up date"
                                type="date"
                                value={editNoteFollowUp}
                                onChange={e => setEditNoteFollowUp(e.target.value)}
                              />
                            </div>
                            <Button
                              size="sm"
                              disabled={noteActing || !editNoteBody.trim()}
                              onClick={() => void saveEditNote()}>
                              {noteActing ? 'Saving…' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={noteActing}
                              onClick={cancelEditNote}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-sm text-foreground">
                            {note.body}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{formatDateTime(note.createdAt)}</span>
                            {note.createdByName ? (
                              <span>by {note.createdByName}</span>
                            ) : null}
                            {note.followUpAt ? (
                              <span className="inline-flex items-center gap-1">
                                <NotebookPen className="size-3" strokeWidth={1.8} />
                                Follow up {formatDate(note.followUpAt)}
                              </span>
                            ) : null}
                          </div>
                          {canWrite ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={noteActing}
                                onClick={() => startEditNote(note)}>
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={noteActing}
                                onClick={() => setPendingDeleteNoteId(note.id)}>
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Section>
      </div>

      <div className="mt-6">
        <Section title="Lead preferences">
          {leadPrefsEmpty ? (
            <p className="text-sm text-muted-foreground">
              Coach has not set lead preferences yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leadPrefRows.map(row => (
                <PrefField
                  key={row.label}
                  icon={<ClipboardCheck className="size-3.5" strokeWidth={1.8} />}
                  label={row.label}
                  value={<span className="break-words">{row.value}</span>}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Documents
        </h2>
        {(pro.verificationFiles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None submitted</p>
        ) : (
          <DataTable
            columns={['Name', 'Submitted', 'Verification', 'Expiry', 'Status', '']}>
            {(pro.verificationFiles ?? []).map(file => {
              const status = file.displayStatus ?? file.status;
              return (
                <tr key={file.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top text-sm text-foreground">
                    <p className="font-medium">{docTypeLabel(file)}</p>
                    {docTypeTagline(file) ? (
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {docTypeTagline(file)}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDate(pro.verificationSubmittedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDate(file.reviewedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatDate(file.expiresAt)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={docStatusTone(status)}>
                      {docStatusLabel(status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top text-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      onClick={() =>
                        setViewer({fileId: file.id, name: file.originalName})
                      }>
                      View
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Wallet, credits and subscription history
        </h2>
        {walletChips.length > 0 ? (
          <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Active filters:
            </span>
            {walletChips.map(chip => (
              <button
                key={chip.key}
                type="button"
                onClick={() => clearOneWalletColumn(chip.key)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-primary hover:text-primary"
                title={`Remove ${WALLET_CHIP_LABELS[chip.key]} filter`}>
                <span className="truncate">{chip.text}</span>
                <span aria-hidden className="text-muted-foreground">
                  ×
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearWalletFilters}
              className="text-xs font-medium text-primary hover:underline">
              Clear all filters
            </button>
          </div>
        ) : null}
        {walletError ? (
          <div className="mb-3">
            <ErrorState
              body={walletError}
              onRetry={() => void loadWallet(walletPage, walletPerPage)}
            />
          </div>
        ) : null}
        {(() => {
          const paymentStatusLabel = (status: string | null | undefined) => {
            if (!status) return '\u2014';
            if (status === 'test') return 'Test';
            if (status === 'completed') return 'Completed';
            return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          };
          const paymentStatusTone = (status: string | null | undefined) => {
            if (status === 'completed') return 'primary' as const;
            if (status === 'test') return 'warning' as const;
            if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
              return 'danger' as const;
            }
            return 'muted' as const;
          };
          const creditsDisplay = (txn: ProfessionalTxn) => {
            if (txn.type === 'spend' || txn.type === 'expiry') {
              return `-${Math.abs(txn.credits)}`;
            }
            return `+${txn.credits}`;
          };
          return (
            <DataTable
              columns={walletColumns}
              pagination={
                <PaginationBar
                  variant="embedded"
                  meta={walletMeta}
                  disabled={walletLoading}
                  onPageChange={next => setWalletPage(next)}
                  onPerPageChange={next => {
                    setWalletPage(1);
                    setWalletPerPage(next);
                  }}
                />
              }
            >              {walletLoading && walletTxns.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Loading wallet history…
                  </td>
                </tr>
              ) : walletTxns.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-sm text-muted-foreground">
                    {walletChips.length > 0
                      ? 'No wallet transactions match these filters.'
                      : 'No wallet transactions yet.'}
                  </td>
                </tr>
              ) : (
                walletTxns.map(txn => {
                  const source =
                    txn.source?.trim() ||
                    txn.packName?.trim() ||
                    creditTxnLabel(txn.label);
                  const when = formatWhenParts(txn.at);
                  return (
                    <tr key={txn.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 align-top font-medium tabular-nums text-foreground">
                        {txn.id}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                        {creditTxnTypeLabel(txn.type)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 align-top text-end text-sm font-semibold tabular-nums ${
                          txn.type === 'spend' || txn.type === 'expiry'
                            ? 'text-muted-foreground'
                            : 'text-primary'
                        }`}>
                        {creditsDisplay(txn)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-end text-sm tabular-nums text-foreground">
                        {txn.totalAed != null && txn.totalAed > 0
                          ? formatAed(txn.totalAed)
                          : '\u2014'}
                      </td>
                      <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                        <div>{source}</div>
                        {txn.promoCode ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Promo {txn.promoCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                        <span className="break-all">
                          {txn.reference?.trim() || txn.orderId?.trim() || '\u2014'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {txn.paymentStatus ? (
                          <Badge tone={paymentStatusTone(txn.paymentStatus)}>
                            {paymentStatusLabel(txn.paymentStatus)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                        {when ? (
                          <div className="leading-snug">
                            <div>{when.date}</div>
                            <div className="text-xs text-muted-foreground/80">
                              {when.time}
                            </div>
                          </div>
                        ) : (
                          '\u2014'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
          );
        })()}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Leads
        </h2>
        {coachLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assigned leads for this coach.
          </p>
        ) : (
          <DataTable
            columns={['ID', 'Goal', 'Format', 'Frequency', 'Status', 'Posted', '']}>
            {coachLeads.map(row => {
              const status = resolvedLeadStatus(row);
              const serviceName =
                serviceNameById.get(row.serviceId) ??
                row.service ??
                row.goal ??
                `Service #${row.serviceId}`;
              const prefs = leadPreferenceDisplay(row, serviceName);
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                    {prefs.goal}
                  </td>
                  <LeadCell value={prefs.format} />
                  <LeadCell value={prefs.frequency} />
                  <td className="px-4 py-3 align-top">
                    <Badge tone={leadStatusTone(status)}>
                      {leadStatusLabel(status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted-foreground">
                    {formatPostedAt(row.postedAt)}
                  </td>
                  <td className="px-4 py-3 align-top text-end">
                    <Link
                      href={`/leads/${row.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      View
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      <FileViewerModal
        open={viewer !== null}
        title={viewer?.name ?? ''}
        onClose={() => setViewer(null)}
        load={loadViewerFile}
      />

      {can(actor, 'activity:read') ? (
        <div className="mt-4">
          <ActivityTimeline scope={{kind: 'coach', id}} />
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingActivate !== null}
        title={pendingActivate ? 'Activate profile?' : 'Deactivate profile?'}
        body={
          pendingActivate
            ? 'The coach profile can go live in the marketplace once verification is approved.'
            : 'The profile will be hidden from clients until activated again.'
        }
        confirmLabel={pendingActivate ? 'Activate' : 'Deactivate'}
        onClose={() => {
          if (!acting) setPendingActivate(null);
        }}
        onConfirm={() => void toggleActivated()}
      />

      <ConfirmDialog
        open={pendingSuspend !== null}
        title={pendingSuspend ? 'Suspend this coach?' : 'Unsuspend this coach?'}
        body={
          pendingSuspend
            ? 'They will be signed out and cannot log in until unsuspended. Marketplace access is blocked while suspended.'
            : 'They will be able to log in again. Marketplace visibility still depends on activation and verification.'
        }
        confirmLabel={pendingSuspend ? 'Suspend' : 'Unsuspend'}
        destructive={pendingSuspend === true}
        onClose={() => {
          if (!acting) setPendingSuspend(null);
        }}
        onConfirm={() => void toggleSuspended()}
      />

      <ConfirmDialog
        open={pendingDeleteNoteId !== null}
        title="Delete this note?"
        body="This removes the note permanently. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onClose={() => {
          if (!noteActing) setPendingDeleteNoteId(null);
        }}
        onConfirm={() => void confirmDeleteNote()}
      />
    </>
  );
}
