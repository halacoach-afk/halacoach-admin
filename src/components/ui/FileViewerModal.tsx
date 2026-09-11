'use client';

import {useEffect, useId, useState} from 'react';
import {createPortal} from 'react-dom';
import {ExternalLink, Loader2, X} from 'lucide-react';
import {Button} from '@/components/ui/Button';

function isImageType(type: string) {
  return type.startsWith('image/');
}

function isPdfType(type: string, name: string) {
  return type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
}

export function FileViewerModal({
  open,
  title,
  onClose,
  load,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  load: () => Promise<Blob>;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setContentType('');
      setObjectUrl(prev => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);
    setObjectUrl(prev => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    void (async () => {
      try {
        const blob = await load();
        if (cancelled) {
          return;
        }
        createdUrl = URL.createObjectURL(blob);
        setContentType(blob.type || 'application/octet-stream');
        setObjectUrl(createdUrl);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to open file.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [open, load]);

  if (!open || !mounted) {
    return null;
  }

  const showImage = Boolean(objectUrl && isImageType(contentType));
  const showPdf = Boolean(objectUrl && isPdfType(contentType, title));

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay p-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <h2
            id={titleId}
            className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
            {title}
          </h2>
          {objectUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => window.open(objectUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={14} />
              New tab
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-muted/30">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-center text-sm text-destructive">{error}</p>
            </div>
          ) : null}

          {!loading && !error && showImage && objectUrl ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={objectUrl} alt={title} className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}

          {!loading && !error && showPdf && objectUrl ? (
            <iframe title={title} src={objectUrl} className="h-full w-full border-0 bg-white" />
          ) : null}

          {!loading && !error && objectUrl && !showImage && !showPdf ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
              <p className="text-sm text-muted-foreground">
                Preview is not available for this file type.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(objectUrl, '_blank', 'noopener,noreferrer')}>
                Open in new tab
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
