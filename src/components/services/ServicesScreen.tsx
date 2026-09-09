'use client';

import {useEffect, useState} from 'react';
import {
  createService,
  isApiError,
  listServices,
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
          {saving ? 'Saving…' : 'Save'}
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
  const canWrite = can(actor.role, 'services:write');
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

  return (
    <>
      <PageHeader title="Services" />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {!canWrite ? (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-deep">
          View only — adding or editing services requires super admin.
        </p>
      ) : null}

      <div className="mb-8">
        <DataTable
          tableClassName="table-fixed"
          columnWidths={canWrite ? ['58%', '18%', '24%'] : ['70%', '30%']}
          columns={canWrite ? ['Name', 'Status', 'Actions'] : ['Name', 'Status']}>
          {services.isLoading && services.items.length === 0 ? (
            <tr>
              <td colSpan={canWrite ? 3 : 2} className="px-4 py-8 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
              </td>
            </tr>
          ) : null}
          {services.error ? (
            <tr>
              <td colSpan={canWrite ? 3 : 2} className="px-4 py-6 text-center">
                <p className="mb-2 text-sm text-destructive">{services.error}</p>
                <button className="text-xs text-primary underline" onClick={() => void load()}>
                  Retry
                </button>
              </td>
            </tr>
          ) : null}
          {services.items.map(service => {
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
                <td className="px-4 py-2">
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
                      <span className="truncate font-medium text-foreground">{service.name}</span>
                    )}
                  </TableCell>
                </td>
                <td className="px-4 py-2">
                  <TableCell>
                    {service.active ? (
                      <Badge tone="primary">Active</Badge>
                    ) : (
                      <Badge tone="muted">Archived</Badge>
                    )}
                  </TableCell>
                </td>
                {canWrite ? (
                  <td className="px-4 py-2">
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
              <td className="px-4 py-2">
                <TableCell>
                  <input
                    className={tableInputClass}
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    placeholder="Personal Training"
                  />
                </TableCell>
              </td>
              <td className="px-4 py-2">
                <TableCell>
                  <Badge tone="sky">New</Badge>
                </TableCell>
              </td>
              <td className="px-4 py-2">
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
