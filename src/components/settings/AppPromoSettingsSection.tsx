'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Plus, X} from 'lucide-react';
import {
  appPromoSlidePublicImageUrl,
  deleteAppPromoSlide,
  isApiError,
  updateAppPromoSettings,
  uploadAppPromoSlide,
  type AppPromoFrequency,
  type AppPromoSettings,
  type AppPromoSlide,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {useConfirm} from '@/components/ui/confirm';
import {cn} from '@/lib/cn';

const tableSelectClass =
  'h-9 w-full max-w-xs rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';

const FREQUENCY_LABELS: Record<AppPromoFrequency, string> = {
  every_open: 'Repeated',
  once: 'Once',
};

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

function slideImageUrl(slideId: string, version: number) {
  return `${appPromoSlidePublicImageUrl(slideId)}?v=${version}`;
}

function PromoSlidePreviewModal({
  open,
  slide,
  index,
  total,
  version,
  canWrite,
  busy,
  onClose,
  onDelete,
}: {
  open: boolean;
  slide: AppPromoSlide | null;
  index: number;
  total: number;
  version: number;
  canWrite: boolean;
  busy: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted || !slide) return null;

  const title = `Promo media ${index + 1}`;
  const src = slideImageUrl(slide.id, version);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay p-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-base font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              Position {index + 1} of {total}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            className="max-h-[min(60vh,28rem)] max-w-full object-contain"
          />
        </div>

        {canWrite ? (
          <div className="flex justify-end border-t border-border px-4 py-3">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:border-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => onDelete(slide.id)}>
              Remove
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function AppPromoSettingsSection({
  settings,
  canWrite,
  onUpdated,
  onError,
}: {
  settings: AppPromoSettings;
  canWrite: boolean;
  onUpdated: (next: AppPromoSettings) => void;
  onError: (message: string) => void;
}) {
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const canEnable = settings.slides.length >= 1;
  const previewIndex = previewId
    ? settings.slides.findIndex(s => s.id === previewId)
    : -1;
  const previewSlide = previewIndex >= 0 ? settings.slides[previewIndex] : null;

  const setEnabled = async (enabled: boolean) => {
    if (!canWrite || busy) return;
    if (enabled && !canEnable) {
      onError('Add at least one media item before enabling the promo popup.');
      return;
    }
    setBusy(true);
    onError('');
    try {
      const next = await updateAppPromoSettings({enabled});
      onUpdated(next);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not update promo enable state.');
    } finally {
      setBusy(false);
    }
  };

  const setFrequency = async (frequency: AppPromoFrequency) => {
    if (!canWrite || busy || frequency === settings.frequency) return;
    setBusy(true);
    onError('');
    try {
      const next = await updateAppPromoSettings({frequency});
      onUpdated(next);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not update promo frequency.');
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (file: File | null) => {
    if (!file || !canWrite || busy) return;
    setBusy(true);
    onError('');
    try {
      const next = await uploadAppPromoSlide(file);
      onUpdated(next);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not upload promo media.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async (id: string) => {
    if (!canWrite || busy) return;
    const ok = await confirm({
      title: 'Remove promo media?',
      body:
        settings.enabled && settings.slides.length <= 1
          ? 'This is the last media item. Disable the promo first, then remove it.'
          : 'This media will be removed from the promo popup.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    onError('');
    try {
      const next = await deleteAppPromoSlide(id);
      onUpdated(next);
      if (previewId === id) setPreviewId(null);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not remove promo media.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Promo Media</h2>
      <div className="mb-8">
        <DataTable columns={['Media', 'Frequency', 'Status']}>
          <tr className="border-b border-border last:border-0">
            <td className="px-4 py-3 align-middle">
              <div className="flex items-center pl-0.5">
                {settings.slides.map((slide, index) => {
                  const label = `Promo media ${index + 1}`;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setPreviewId(slide.id)}
                      style={{zIndex: index + 1}}
                      className={cn(
                        'relative inline-flex size-9 shrink-0 overflow-hidden rounded-full',
                        'border border-primary bg-muted outline-none ring-2 ring-card',
                        'transition hover:z-50 hover:ring-primary/30',
                        'focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-primary',
                        index > 0 && '-ml-1.5',
                      )}
                      aria-label={`Preview ${label}`}
                      title={label}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slideImageUrl(slide.id, settings.version)}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                  );
                })}
                {canWrite ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={e => void onPickFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                      style={{zIndex: settings.slides.length + 1}}
                      className={cn(
                        'relative inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                        'border border-dashed border-primary bg-primary-soft text-primary outline-none ring-2 ring-card',
                        'transition hover:z-50 hover:bg-primary hover:text-white',
                        'focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-primary',
                        'disabled:cursor-default disabled:opacity-70',
                        settings.slides.length > 0 && '-ml-1.5',
                      )}
                      aria-label="Add promo media"
                      title="Add">
                      <Plus size={16} strokeWidth={2.25} />
                    </button>
                  </>
                ) : settings.slides.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No media yet</span>
                ) : null}
              </div>
            </td>
            <td className="px-4 py-3 align-middle">
              {canWrite ? (
                <select
                  className={cn(tableSelectClass, 'w-auto min-w-[9rem]')}
                  value={settings.frequency}
                  disabled={busy}
                  aria-label="Show frequency"
                  onChange={e => void setFrequency(e.target.value as AppPromoFrequency)}>
                  <option value="every_open">{FREQUENCY_LABELS.every_open}</option>
                  <option value="once">{FREQUENCY_LABELS.once}</option>
                </select>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {FREQUENCY_LABELS[settings.frequency]}
                </span>
              )}
            </td>
            <td className="px-4 py-3 align-middle">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {busy ? 'Saving…' : settings.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {canWrite ? (
                  <FeatureSwitch
                    checked={settings.enabled}
                    disabled={busy || (!settings.enabled && !canEnable)}
                    label={
                      settings.enabled ? 'Disable landing promo' : 'Enable landing promo'
                    }
                    onChange={() => void setEnabled(!settings.enabled)}
                  />
                ) : null}
              </div>
            </td>
          </tr>
        </DataTable>
      </div>

      <PromoSlidePreviewModal
        open={previewSlide != null}
        slide={previewSlide}
        index={previewIndex}
        total={settings.slides.length}
        version={settings.version}
        canWrite={canWrite}
        busy={busy}
        onClose={() => setPreviewId(null)}
        onDelete={id => void onDelete(id)}
      />
    </>
  );
}
