'use client';

import {Button} from './Button';

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lg">
        <h2 id="confirm-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
