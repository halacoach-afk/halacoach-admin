'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDownAZ, ArrowUpAZ, ChevronDown} from 'lucide-react';
import {cn} from '@/lib/cn';

const panelInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary';

type PanelPos = {top: number; left: number};

export function ExcelColumnFilter({
  label,
  active = false,
  sortDirection = null,
  open,
  onOpenChange,
  onClear,
  onApply,
  onSortAsc,
  onSortDesc,
  sortAscLabel = 'Ascending',
  sortDescLabel = 'Descending',
  children,
}: {
  label: string;
  active?: boolean;
  /** Current sort direction when this column is the active sort. */
  sortDirection?: 'asc' | 'desc' | null;
  /** Controlled open state (so only one column menu is open). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear?: () => void;
  /** Commit this column’s draft filter (other column filters stay active). */
  onApply?: () => void;
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  sortAscLabel?: string;
  sortDescLabel?: string;
  children: ReactNode;
}) {
  const showSort = Boolean(onSortAsc && onSortDesc);
  const headerActive = active || sortDirection !== null;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [pos, setPos] = useState<PanelPos>({top: 0, left: 0});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const panelWidth = 224; // w-56
      let left = rect.left;
      if (left + panelWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.right - panelWidth);
      }
      setPos({top: rect.bottom + 6, left});
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-start font-semibold transition-colors',
          'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          headerActive ? 'text-primary' : 'text-muted-foreground',
        )}>
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 transition-transform',
            open && 'rotate-180',
            headerActive ? 'text-primary' : 'text-muted-foreground',
          )}
          strokeWidth={2.2}
          aria-hidden
        />
        {headerActive ? (
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        ) : null}
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role="dialog"
              aria-label={`Filter ${label}`}
              style={{top: pos.top, left: pos.left}}
              className="fixed z-[80] w-56 rounded-xl border border-border bg-card p-3 shadow-lg">
              {showSort ? (
                <div className="mb-2 space-y-0.5 border-b border-border pb-2">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm',
                      sortDirection === 'asc'
                        ? 'bg-muted font-medium text-primary'
                        : 'text-foreground hover:bg-muted',
                    )}
                    onClick={() => {
                      onSortAsc?.();
                      onOpenChange(false);
                    }}>
                    <ArrowUpAZ className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    {sortAscLabel}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm',
                      sortDirection === 'desc'
                        ? 'bg-muted font-medium text-primary'
                        : 'text-foreground hover:bg-muted',
                    )}
                    onClick={() => {
                      onSortDesc?.();
                      onOpenChange(false);
                    }}>
                    <ArrowDownAZ className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                    {sortDescLabel}
                  </button>
                </div>
              ) : null}
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Combines with other column filters
                </p>
                {children}
              </div>
              <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2">
                {onApply ? (
                  <button
                    type="button"
                    className="w-full rounded-lg bg-primary px-2 py-1.5 text-sm font-medium text-white hover:bg-primary-deep"
                    onClick={() => {
                      onApply();
                      onOpenChange(false);
                    }}>
                    Apply filter
                  </button>
                ) : null}
                {onClear && active ? (
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-start text-xs font-medium text-primary hover:bg-muted"
                    onClick={() => {
                      onClear();
                      onOpenChange(false);
                    }}>
                    Clear this column
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ExcelFilterTextField({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  label?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-1">
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={panelInputClass}
      />
    </label>
  );
}

export function ExcelFilterSelectField({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{value: string; label: string}>;
  label?: string;
}) {
  return (
    <label className="block space-y-1">
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(panelInputClass, 'pe-7')}>
        {options.map(opt => (
          <option key={opt.value || 'any'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Excel-style multi-select checklist (OR within the column). */
export function ExcelFilterMultiSelect({
  values,
  onChange,
  options,
  searchPlaceholder = 'Search…',
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: Array<{value: string; label: string}>;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState('');
  const selected = new Set(values);
  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? options.filter(opt => opt.label.toLowerCase().includes(normalized))
    : options;

  const toggle = (value: string) => {
    if (selected.has(value)) {
      onChange(values.filter(v => v !== value));
      return;
    }
    onChange([...values, value]);
  };

  return (
    <div className="space-y-2">
      {options.length > 6 ? (
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className={panelInputClass}
          aria-label={searchPlaceholder}
        />
      ) : null}
      <div className="max-h-48 space-y-0.5 overflow-y-auto pe-0.5">
        {visible.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">No matches</p>
        ) : (
          visible.map(opt => {
            const checked = selected.has(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm text-foreground',
                  'hover:bg-muted',
                )}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="size-3.5 shrink-0 rounded border-border accent-primary"
                />
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
      {values.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {values.length} selected · match any
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Select one or more</p>
      )}
    </div>
  );
}
