'use client';

import {Button} from '@/components/ui/Button';
import type {PaginationMeta} from '@/lib/pagination';

export function PaginationBar({
  meta,
  onPageChange,
  disabled = false,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (meta.total <= 0) {
    return null;
  }

  const from = (meta.page - 1) * meta.perPage + 1;
  const to = Math.min(meta.page * meta.perPage, meta.total);
  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.lastPage;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        Showing{' '}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{' '}
        of <span className="font-medium text-foreground">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(meta.page - 1)}>
          Previous
        </Button>
        <span className="min-w-[5.5rem] text-center tabular-nums">
          Page {meta.page} / {meta.lastPage}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
