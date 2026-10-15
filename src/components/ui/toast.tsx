'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {Check, TriangleAlert} from 'lucide-react';
import {cn} from '@/lib/cn';

const TOAST_MS = 3500;

export type ToastVariant = 'success' | 'error';

export type ToastPayload = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  show: (payload: ToastPayload) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({children}: {children: ReactNode}) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => setToast(null), []);

  const show = useCallback((payload: ToastPayload) => {
    idRef.current += 1;
    setToast({
      id: idRef.current,
      title: payload.title,
      description: payload.description,
      variant: payload.variant ?? 'success',
    });
  }, []);

  const success = useCallback(
    (title: string, description?: string) => {
      show({title, description, variant: 'success'});
    },
    [show],
  );

  const error = useCallback(
    (title: string, description?: string) => {
      show({title, description, variant: 'error'});
    },
    [show],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  const value = useMemo(() => ({show, success, error}), [show, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-3">
          <button
            type="button"
            aria-live="polite"
            role="alert"
            onClick={dismiss}
            className={cn(
              'pointer-events-auto flex max-w-[360px] items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 text-start shadow-md transition-all duration-200',
            )}>
            <span
              className={cn(
                'grid size-[22px] shrink-0 place-items-center rounded-full text-white',
                toast.variant === 'error' ? 'bg-destructive' : 'bg-foreground',
              )}>
              {toast.variant === 'error' ? (
                <TriangleAlert className="size-3.5" />
              ) : (
                <Check className="size-3.5" strokeWidth={2.6} />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{toast.title}</span>
              {toast.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {toast.description}
                </span>
              ) : null}
            </span>
          </button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
