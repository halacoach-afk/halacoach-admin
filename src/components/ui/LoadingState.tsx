export function LoadingState({label = 'Loading...'}: {label?: string}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </div>
  );
}
