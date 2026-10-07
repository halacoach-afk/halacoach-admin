'use client';

import {useEffect, useRef, useState, type DragEvent} from 'react';
import {GripVertical} from 'lucide-react';
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
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {DataTable} from '@/components/ui/DataTable';
import {PageHeader} from '@/components/ui/PageHeader';
import {cn} from '@/lib/cn';
import {can} from '@/lib/permissions';

const tableInputClass =
  'h-9 w-full min-w-0 max-w-md rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const tableCellClass = 'flex h-9 min-w-0 items-center';
const nameCellClass = 'min-w-[12rem] max-w-md px-4 py-2 whitespace-normal';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';
const deleteButtonClass = 'min-w-[5.5rem] shrink-0 justify-center';
const addButtonClass = cn(
  actionButtonClass,
  'transform-gpu disabled:opacity-100 disabled:bg-primary-soft disabled:text-primary',
);

function TableCell({children, className}: {children: React.ReactNode; className?: string}) {
  return <div className={cn(tableCellClass, className)}>{children}</div>;
}

type NameDraft = {name: string; nameAr: string};

function draftFrom(service: CatalogService): NameDraft {
  return {name: service.name, nameAr: service.nameAr ?? ''};
}

function CatalogActions({
  isEditing,
  saving,
  onCancel,
  onSave,
  onEdit,
  onDelete,
}: {
  isEditing: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
      <Button size="sm" variant="danger" className={deleteButtonClass} onClick={onDelete}>
        Delete
      </Button>
    </TableCell>
  );
}

function reorderList(items: CatalogService[], fromId: number, toId: number) {
  if (fromId === toId) return null;
  const fromIndex = items.findIndex(item => item.id === fromId);
  const toIndex = items.findIndex(item => item.id === toId);
  if (fromIndex < 0 || toIndex < 0) return null;
  const next = [...items];
  const [row] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, row);
  return next;
}

export function ServicesScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'services:write');
  const [services, setServices] = useState<{
    items: CatalogService[];
    isLoading: boolean;
    error: string | null;
  }>({items: [], isLoading: true, error: null});
  const [drafts, setDrafts] = useState<Record<number, NameDraft>>({});
  const [createName, setCreateName] = useState('');
  const [createNameAr, setCreateNameAr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CatalogService | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dragIdRef = useRef<number | null>(null);

  const load = async () => {
    setServices(state => ({...state, isLoading: true, error: null}));
    try {
      const items = (await listServices()).filter(item => item.active);
      setServices({items, isLoading: false, error: null});
      setDrafts(Object.fromEntries(items.map(item => [item.id, draftFrom(item)])));
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
    setDrafts(state => ({...state, [service.id]: draftFrom(service)}));
    setError(null);
  };

  const cancelEdit = (service: CatalogService) => {
    setEditingId(current => (current === service.id ? null : current));
    setDrafts(state => ({...state, [service.id]: draftFrom(service)}));
  };

  const save = async (id: number) => {
    const name = (drafts[id]?.name ?? '').trim();
    const nameAr = (drafts[id]?.nameAr ?? '').trim();
    if (!name) {
      setError('Service name cannot be empty.');
      return;
    }
    setSavingId(id);
    setError(null);
    try {
      await updateService(id, {name, nameAr: nameAr || null});
      setEditingId(current => (current === id ? null : current));
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save service.');
    } finally {
      setSavingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setError(null);
    try {
      await updateService(target.id, {active: false});
      setPendingDelete(null);
      setEditingId(current => (current === target.id ? null : current));
      setServices(state => ({
        ...state,
        items: state.items.filter(item => item.id !== target.id),
      }));
      setDrafts(state => {
        const next = {...state};
        delete next[target.id];
        return next;
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not delete service.');
    } finally {
      setDeleting(false);
    }
  };

  const persistOrder = async (next: CatalogService[]) => {
    setReordering(true);
    setError(null);
    setServices(state => ({...state, items: next}));
    try {
      const reordered = (await reorderServices({orderedIds: next.map(item => item.id)})).filter(
        item => item.active,
      );
      setServices({items: reordered, isLoading: false, error: null});
      setDrafts(Object.fromEntries(reordered.map(item => [item.id, draftFrom(item)])));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not reorder services.');
      await load();
    } finally {
      setReordering(false);
    }
  };

  const onDragStart = (event: DragEvent<HTMLButtonElement>, id: number) => {
    if (!canWrite || reordering || editingId !== null) {
      event.preventDefault();
      return;
    }
    dragIdRef.current = id;
    setDraggingId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(id));
  };

  const onDragOver = (event: DragEvent<HTMLTableRowElement>, id: number) => {
    if (!canWrite || dragIdRef.current == null || reordering) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetId !== id) setDropTargetId(id);
  };

  const onDrop = (event: DragEvent<HTMLTableRowElement>, toId: number) => {
    event.preventDefault();
    const fromId = dragIdRef.current ?? Number(event.dataTransfer.getData('text/plain'));
    setDraggingId(null);
    setDropTargetId(null);
    dragIdRef.current = null;
    if (!canWrite || reordering || !fromId) return;
    const next = reorderList(services.items, fromId, toId);
    if (next) void persistOrder(next);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
    dragIdRef.current = null;
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
      await createService({name, nameAr: createNameAr.trim() || null});
      setCreateName('');
      setCreateNameAr('');
      await load();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not create service.');
    } finally {
      setCreating(false);
    }
  };

  const colCount = canWrite ? 5 : 4;

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

      <div className="mb-8 min-w-0">
        <DataTable
          tableClassName="min-w-0"
          columnHeaderClassNames={
            canWrite ? [undefined, undefined, undefined, undefined, 'text-right'] : undefined
          }
          columns={
            canWrite
              ? ['#', 'English', 'Arabic', 'Status', 'Actions']
              : ['#', 'English', 'Arabic', 'Status']
          }>
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
            const draft = drafts[service.id] ?? draftFrom(service);
            const isEditing = canWrite && editingId === service.id;
            const isDragging = draggingId === service.id;
            const isDropTarget = dropTargetId === service.id && draggingId !== service.id;
            return (
              <tr
                key={service.id}
                onDragOver={event => onDragOver(event, service.id)}
                onDrop={event => onDrop(event, service.id)}
                className={cn(
                  'border-b border-border last:border-0',
                  isEditing && 'bg-primary-soft/30',
                  isDragging && 'opacity-50',
                  isDropTarget && 'bg-sky-soft ring-1 ring-inset ring-sky',
                )}>
                <td className="px-4 py-2 whitespace-nowrap">
                  <TableCell className="flex-nowrap gap-2">
                    {canWrite ? (
                      <button
                        type="button"
                        draggable={!reordering && !isEditing}
                        onDragStart={event => onDragStart(event, service.id)}
                        onDragEnd={onDragEnd}
                        disabled={reordering || isEditing}
                        className={cn(
                          'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground',
                          !reordering && !isEditing && 'cursor-grab active:cursor-grabbing hover:bg-muted hover:text-foreground',
                          (reordering || isEditing) && 'cursor-not-allowed opacity-40',
                        )}
                        aria-label={`Drag to reorder ${service.name}`}
                        title="Drag to reorder">
                        <GripVertical className="size-4" />
                      </button>
                    ) : null}
                    <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                  </TableCell>
                </td>
                <td className={nameCellClass}>
                  <TableCell>
                    {isEditing ? (
                      <input
                        className={tableInputClass}
                        value={draft.name}
                        onChange={e =>
                          setDrafts(state => ({
                            ...state,
                            [service.id]: {...draft, name: e.target.value},
                          }))
                        }
                      />
                    ) : (
                      <span className="truncate font-medium text-foreground" title={service.name}>
                        {service.name}
                      </span>
                    )}
                  </TableCell>
                </td>
                <td className={nameCellClass}>
                  <TableCell>
                    {isEditing ? (
                      <input
                        className={cn(tableInputClass, 'text-end')}
                        dir="rtl"
                        value={draft.nameAr}
                        onChange={e =>
                          setDrafts(state => ({
                            ...state,
                            [service.id]: {...draft, nameAr: e.target.value},
                          }))
                        }
                      />
                    ) : (
                      <span
                        className="truncate font-medium text-foreground"
                        dir={service.nameAr ? 'rtl' : undefined}
                        title={service.nameAr ?? ''}>
                        {service.nameAr?.trim() || '—'}
                      </span>
                    )}
                  </TableCell>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <TableCell className="flex-nowrap">
                    <Badge tone="primary">Active</Badge>
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
                      onDelete={() => setPendingDelete(service)}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
          {canWrite ? (
            <tr className="border-t-2 border-border bg-primary-soft/40">
              <td className="px-4 py-2 whitespace-nowrap">
                <TableCell>
                  <span className="text-sm text-muted-foreground">—</span>
                </TableCell>
              </td>
              <td className={nameCellClass}>
                <TableCell>
                  <input
                    className={tableInputClass}
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Personal Training"
                  />
                </TableCell>
              </td>
              <td className={nameCellClass}>
                <TableCell>
                  <input
                    className={cn(tableInputClass, 'text-end')}
                    dir="rtl"
                    value={createNameAr}
                    onChange={e => setCreateNameAr(e.target.value)}
                    placeholder="تدريب شخصي"
                  />
                </TableCell>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <TableCell className="flex-nowrap">
                  <Badge tone="sky">New</Badge>
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
                  <span className={deleteButtonClass} aria-hidden />
                </TableCell>
              </td>
            </tr>
          ) : null}
        </DataTable>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this service?"
        body="This can’t be undone from the list."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        destructive
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
