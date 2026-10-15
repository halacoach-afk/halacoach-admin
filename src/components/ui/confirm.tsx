'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {ConfirmDialog} from './ConfirmDialog';

export type ConfirmOptions = {
  title?: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const DEFAULTS: Required<Pick<ConfirmOptions, 'title' | 'body' | 'confirmLabel'>> & {
  destructive: boolean;
} = {
  title: 'Save changes?',
  body: 'Are you sure you want to save these changes?',
  confirmLabel: 'Save',
  destructive: false,
};

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function ConfirmProvider({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>(DEFAULTS);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }, []);

  const confirm = useCallback((next?: ConfirmOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setOptions({
      title: next?.title ?? DEFAULTS.title,
      body: next?.body ?? DEFAULTS.body,
      confirmLabel: next?.confirmLabel ?? DEFAULTS.confirmLabel,
      destructive: next?.destructive ?? DEFAULTS.destructive,
    });
    setOpen(true);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(() => ({confirm}), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={open}
        title={options.title ?? DEFAULTS.title}
        body={options.body ?? DEFAULTS.body}
        confirmLabel={options.confirmLabel ?? DEFAULTS.confirmLabel}
        destructive={options.destructive}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}
