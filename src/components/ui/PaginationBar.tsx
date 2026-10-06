'use client';

import {useEffect, useId, useState, type ReactNode} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {cn} from '@/lib/cn';
import {PER_PAGE_OPTIONS, type PaginationMeta} from '@/lib/pagination';

type PageItem = number | 'ellipsis';

function buildPageItems(current: number, lastPage: number): PageItem[] {
  if (lastPage <= 1) return [1];
  if (lastPage <= 7) {
    return Array.from({length: lastPage}, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(lastPage - 1, current + 1);

  if (start > 2) items.push('ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < lastPage - 1) items.push('ellipsis');
  items.push(lastPage);
  return items;
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground',
        'disabled:pointer-events-none disabled:opacity-35',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      )}>
      {children}
    </button>
  );
}

export function PaginationBar({
  meta,
  onPageChange,
  onPerPageChange,
  disabled = false,
  perPageOptions = PER_PAGE_OPTIONS,
  variant = 'standalone',
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  disabled?: boolean;
  perPageOptions?: readonly number[];
  /** `embedded` sits inside a DataTable footer (no outer card). */
  variant?: 'standalone' | 'embedded';
}) {
  const jumpId = useId();
  const [jumpValue, setJumpValue] = useState(String(meta.page));

  useEffect(() => {
    setJumpValue(String(meta.page));
  }, [meta.page]);

  if (meta.total <= 0) {
    return null;
  }

  const from = (meta.page - 1) * meta.perPage + 1;
  const to = Math.min(meta.page * meta.perPage, meta.total);
  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.lastPage;
  const pageItems = buildPageItems(meta.page, meta.lastPage);
  const multiPage = meta.lastPage > 1;

  const goToPage = (page: number) => {
    const next = Math.min(meta.lastPage, Math.max(1, Math.floor(page)));
    if (next !== meta.page) onPageChange(next);
  };

  const submitJump = () => {
    const parsed = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(parsed)) {
      setJumpValue(String(meta.page));
      return;
    }
    goToPage(parsed);
  };

  return (
    <div
      className={cn(
        variant === 'standalone' &&
          'mt-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm sm:px-4',
        variant === 'embedded' && 'border-t border-border bg-muted/30 px-3 py-2.5 sm:px-4',
      )}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {from.toLocaleString()}–{to.toLocaleString()}
            </span>
            <span className="mx-1">of</span>
            <span className="font-semibold tabular-nums text-foreground">
              {meta.total.toLocaleString()}
            </span>
          </p>

          {onPerPageChange ? (
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">Rows</span>
              <select
                value={meta.perPage}
                disabled={disabled}
                aria-label="Rows per page"
                onChange={event => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(next)) onPerPageChange(next);
                }}
                className={cn(
                  'h-8 rounded-lg border border-border bg-card px-2 text-sm font-medium tabular-nums text-foreground',
                  'outline-none transition-colors',
                  'hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}>
                {perPageOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm tabular-nums text-muted-foreground">
            Page{' '}
            <span className="font-semibold text-foreground">{meta.page}</span>
            <span className="mx-0.5">/</span>
            <span className="font-semibold text-foreground">{meta.lastPage}</span>
          </p>

          <div
            className={cn(
              'inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5',
              disabled && 'opacity-60',
            )}
            role="navigation"
            aria-label="Pagination">
            <NavButton
              label="First page"
              disabled={disabled || !canPrev}
              onClick={() => goToPage(1)}>
              <ChevronsLeft size={15} />
            </NavButton>
            <NavButton
              label="Previous page"
              disabled={disabled || !canPrev}
              onClick={() => goToPage(meta.page - 1)}>
              <ChevronLeft size={15} />
            </NavButton>

            <div className="mx-0.5 hidden items-center gap-0.5 sm:flex">
              {pageItems.map((item, index) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex h-8 min-w-8 items-center justify-center text-xs text-muted-foreground"
                    aria-hidden>
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Page ${item}`}
                    aria-current={item === meta.page ? 'page' : undefined}
                    disabled={disabled}
                    onClick={() => goToPage(item)}
                    className={cn(
                      'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                      'disabled:cursor-not-allowed',
                      item === meta.page
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-foreground hover:bg-muted',
                    )}>
                    {item}
                  </button>
                ),
              )}
            </div>

            <NavButton
              label="Next page"
              disabled={disabled || !canNext}
              onClick={() => goToPage(meta.page + 1)}>
              <ChevronRight size={15} />
            </NavButton>
            <NavButton
              label="Last page"
              disabled={disabled || !canNext}
              onClick={() => goToPage(meta.lastPage)}>
              <ChevronsRight size={15} />
            </NavButton>
          </div>

          {multiPage ? (
            <form
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
              onSubmit={event => {
                event.preventDefault();
                submitJump();
              }}>
              <label htmlFor={jumpId} className="whitespace-nowrap">
                Go to
              </label>
              <input
                id={jumpId}
                type="number"
                min={1}
                max={meta.lastPage}
                value={jumpValue}
                disabled={disabled}
                aria-label="Go to page"
                onChange={event => setJumpValue(event.target.value)}
                onBlur={submitJump}
                className={cn(
                  'h-8 w-14 rounded-lg border border-border bg-card px-2 text-center text-sm font-medium tabular-nums text-foreground',
                  'outline-none transition-colors',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                )}
              />
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
