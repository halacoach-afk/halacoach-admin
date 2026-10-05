'use client';

import {useEffect, useState} from 'react';
import {ChevronDown, ChevronUp} from 'lucide-react';
import {
  createService,
  isApiError,
  listServices,
  reorderServices,
  updateService,
  type CatalogService,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {PageHeader} from '@/components/ui/PageHeader';
import {cn} from '@/lib/cn';
import {can} from '@/lib/permissions';

const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const tableCellClass = 'flex h-9 items-center';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';
const archiveButtonClass = 'min-w-[5.5rem] shrink-0 justify-center';
const sortButtonClass = 'size-8 shrink-0 justify-center px-0';
const addButtonClass = cn(
  actionButtonClass,
  'transform-gpu disabled:opacity-100 disabled:bg-primary-soft disabled:text-primary',
);

function TableCell({children, className}: {children: React.ReactNode; className?: string}) {
  return <div className={cn(tableCellClass, className)}>{children}</div>;
}

function CatalogActions({
  isEditing,
  saving,
  onCancel,
  onSave,
  onEdit,
  toggleLabel,
  onToggle,
}: {
  isEditing: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onEdit: () => void;
  toggleLabel: string;
  onToggle: () => void;
}) {
  return (
    <TableCell className="flex-nowrap justify-end gap-1">
      {isEditing ? (
        <Button size="sm" variant="outline" className={actionButtonClass} onClick={onCancel}>
          Cancel
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={cn(actionButtonClass, 'invisible pointer-events-none')}
          tabIndex={-1}
          aria-hidden>
          Cancel
        </Button>
      )}
      {isEditing ? (
        <Button size="sm" className={actionButtonClass} disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className={actionButtonClass} onClick={onEdit}>
          Edit
        </Button>
      )}
      <Button size="sm" variant="outline" className={archiveButtonClass} onClick={onToggle}>
        {toggleLabel}
      </Button>
    </TableCell>
  );
}

export function ServicesScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'services:write');
  const [services, setServices] = useState<{
    items: CatalogService[];
    isLoading: boolean;
    error: string | null;
  }>({items: [], isLoading: true, error: null});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [createName, setCreateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = async () => {
    setServices(state => ({...state, isLoading: true, error: null}));
    try {
      const items = await listServices();
      setServices({items, isLoading: false, error: null});
      setDrafts(Object.fromEntries(items.map(item => [item.id, item.name])));
    } catch (err) {
      setServices(state => ({
        ...state,
        isLoading: false,
        error: isApiError(err) ? err.message : 'Could not load services.',
      }));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (service: CatalogService) => {
    setEditingId(service.id);
    setDrafts(state => ({...state, [service.id]: service.name}));
    setError(null);
  };

  const cancelEdit = (service: CatalogService) => {
    setEditingId(current => (current === service.id ? null : current));
    setDrafts(state => ({...state, [service.id]: service.name}));
  };

  const save = async (id: number) => {
    const name = (drafts[id] ?? '').trim();
    if (!name) {
      setError('Service name cannot be empty.');
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      await updateService(id, {name});
      setEditingId(current => (current === id ? null : current));
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save service.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (service: CatalogService) => {
    setError(null);
    try {
      await updateService(service.id, {active: !service.active});
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update service.');
    }
  };

  const moveService = async (id: number, direction: 'up' | 'down') => {
    const items = services.items;
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);

    setReordering(true);
    setError(null);
    setServices(state => ({...state, items: next}));
    try {
      const reordered = await reorderServices({orderedIds: next.map(item => item.id)});
      setServices({items: reordered, isLoading: false, error: null});
      setDrafts(Object.fromEntries(reordered.map(item => [item.id, item.name])));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not reorder services.');
      await load();
    } finally {
      setReordering(false);
    }
  };

  const submitCreate = async () => {
    const name = createName.trim();
    if (!name) {
      setError('Service name cannot be empty.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createService({name});
      setCreateName('');
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not create service.');
    } finally {
      setCreating(false);
    }
  };

  const colCount = canWrite ? 4 : 3;

  return (
    <>
      <PageHeader
        title="Services"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only - adding or editing services requires super admin.
        </p>
      ) : null}

      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={
            canWrite ? [undefined, undefined, undefined, 'text-right'] : undefined
          }
          columns={canWrite ? ['Name', 'Status', 'Order', 'Actions'] : ['Name', 'Status', 'Order']}>
          {services.isLoading && services.items.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-8 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </td>
            </tr>
          ) : null}
          {services.error ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-6 text-center">
                <p className="mb-2 text-sm text-destructive">{services.error}</p>
                <button className="text-xs text-primary underline" onClick={() => void load()}>
                  Retry
                </button>
              </td>
            </tr>
          ) : null}
          {services.items.map((service, index) => {
            const draft = drafts[service.id] ?? service.name;
            const isEditing = canWrite && editingId === service.id;
            return (
              <tr
                key={service.id}
                className={cn(
                  'border-b border-border last:border-0',
                  !service.active && 'bg-muted/30',
                  isEditing && 'bg-primary-soft/30',
                )}>
                <td className="w-full px-4 py-2">
                  <TableCell>
                    {isEditing ? (
                      <input
                        className={tableInputClass}
                        value={draft}
                        onChange={e =>
                          setDrafts(state => ({...state, [service.id]: e.target.value}))
                        }
                      />
                    ) : (
                      <span className="font-medium text-foreground whitespace-nowrap">
                        {service.name}
                      </span>
                    )}
                  </TableCell>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <TableCell className="flex-nowrap">
                    {service.active ? (
                      <Badge tone="primary">Active</Badge>
                    ) : (
                      <Badge tone="muted">Archived</Badge>
                    )}
                  </TableCell>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <TableCell className="flex-nowrap gap-1.5">
                    <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    {canWrite ? (
                      <span className="flex shrink-0 flex-nowrap gap-0.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className={sortButtonClass}
                          disabled={reordering || index === 0}
                          aria-label={`Move ${service.name} up`}
                          onClick={() => void moveService(service.id, 'up')}>
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={sortButtonClass}
                          disabled={reordering || index === services.items.length - 1}
                          aria-label={`Move ${service.name} down`}
                          onClick={() => void moveService(service.id, 'down')}>
                          <ChevronDown className="size-4" />
                        </Button>
                      </span>
                    ) : null}
                  </TableCell>
                </td>
                {canWrite ? (
                  <td className="px-4 py-2 whitespace-nowrap">
                    <CatalogActions
                      isEditing={isEditing}
                      saving={savingId === service.id}
                      onCancel={() => cancelEdit(service)}
                      onSave={() => void save(service.id)}
                      onEdit={() => startEdit(service)}
                      toggleLabel={service.active ? 'Archive' : 'Restore'}
                      onToggle={() => void toggleActive(service)}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
          {canWrite ? (
            <tr className="border-t-2 border-border bg-primary-soft/40">
              <td className="w-full px-4 py-2">
                <TableCell>
                  <input
                    className={tableInputClass}
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Personal Training"
                  />
                </TableCell>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <TableCell className="flex-nowrap">
                  <Badge tone="sky">New</Badge>
                </TableCell>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <TableCell>
                  <span className="text-sm text-muted-foreground">—</span>
                </TableCell>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <TableCell className="flex-nowrap justify-end gap-1">
                  <span className={actionButtonClass} aria-hidden />
                  <Button
                    size="sm"
                    className={addButtonClass}
                    disabled={creating || !createName.trim()}
                    onClick={() => void submitCreate()}>
                    {creating ? (
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/40 border-t-current" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                  <span className={archiveButtonClass} aria-hidden />
                </TableCell>
              </td>
            </tr>
          ) : null}
        </DataTable>
      </div>
    </>
  );
}
