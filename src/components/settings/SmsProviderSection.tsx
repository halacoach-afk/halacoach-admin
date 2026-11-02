'use client';

import {useState} from 'react';
import {
  isApiError,
  updateSmsProviderSettings,
  type SmsProviderId,
  type SmsProviderSettings,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {useConfirm} from '@/components/ui/confirm';
import {cn} from '@/lib/cn';

const tableSelectClass =
  'h-9 w-full max-w-xs rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';

const PROVIDER_LABELS: Record<SmsProviderId, string> = {
  brevo: 'Brevo',
  messagecentral: 'MessageCentral',
};

export function SmsProviderSection({
  settings,
  canWrite,
  onUpdated,
  onError,
}: {
  settings: SmsProviderSettings;
  canWrite: boolean;
  onUpdated: (next: SmsProviderSettings) => void;
  onError: (message: string) => void;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SmsProviderId>(settings.provider);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!canWrite || saving) return;
    setDraft(settings.provider);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(settings.provider);
    setEditing(false);
  };

  const save = async () => {
    if (!canWrite || saving) return;
    if (draft === settings.provider) {
      setEditing(false);
      return;
    }

    const ok = await confirm({
      title: 'Switch SMS provider?',
      body: '',
      confirmLabel: 'Switch',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const next = await updateSmsProviderSettings({provider: draft});
      onUpdated(next);
      setEditing(false);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not update SMS provider.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-foreground">SMS delivery</h2>
      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={canWrite ? [undefined, 'text-right'] : undefined}
          columns={canWrite ? ['Provider', 'Actions'] : ['Provider']}>
          <tr
            className={cn(
              'border-b border-border last:border-0',
              editing && 'bg-primary-soft/30',
            )}>
            <td className="px-4 py-2">
              <div className="flex h-9 items-center">
                {editing ? (
                  <select
                    className={tableSelectClass}
                    value={draft}
                    disabled={saving}
                    onChange={event => setDraft(event.target.value as SmsProviderId)}>
                    {settings.providers.map(id => (
                      <option key={id} value={id}>
                        {PROVIDER_LABELS[id]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-foreground">
                    {PROVIDER_LABELS[settings.provider]}
                  </span>
                )}
              </div>
            </td>
            {canWrite ? (
              <td className="px-4 py-2">
                <div className="flex h-9 flex-nowrap items-center justify-end gap-1">
                  {editing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      disabled={saving}
                      onClick={cancelEdit}>
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
                  {editing ? (
                    <Button
                      size="sm"
                      className={actionButtonClass}
                      disabled={saving}
                      onClick={() => void save()}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      onClick={startEdit}>
                      Edit
                    </Button>
                  )}
                </div>
              </td>
            ) : null}
          </tr>
        </DataTable>
      </div>
    </>
  );
}
