'use client';

import {useState} from 'react';
import {
  isApiError,
  updateMobileAppSettings,
  type MobileAppPolicySettings,
  type MobilePlatformPolicy,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {useConfirm} from '@/components/ui/confirm';
import {cn} from '@/lib/cn';

const tableInputClass =
  'h-9 w-full max-w-xs rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';
const VERSION_RE = /^\d+(\.\d+){0,3}$/;

type PlatformKey = 'android' | 'ios';

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  android: 'Android',
  ios: 'iOS',
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

function emptyDraft(policy: MobilePlatformPolicy): MobilePlatformPolicy {
  return {
    latestVersion: policy.latestVersion,
    forceUpdate: policy.forceUpdate,
    storeUrl: policy.storeUrl,
  };
}

function isDirty(a: MobilePlatformPolicy, b: MobilePlatformPolicy): boolean {
  return (
    a.latestVersion.trim() !== b.latestVersion.trim() ||
    a.forceUpdate !== b.forceUpdate ||
    a.storeUrl.trim() !== b.storeUrl.trim()
  );
}

export function MobileAppSettingsSection({
  policy,
  canWrite,
  onUpdated,
  onError,
}: {
  policy: MobileAppPolicySettings;
  canWrite: boolean;
  onUpdated: (next: MobileAppPolicySettings) => void;
  onError: (message: string) => void;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<PlatformKey | null>(null);
  const [draft, setDraft] = useState<MobilePlatformPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = async (platform: PlatformKey) => {
    if (!canWrite || saving) return;
    if (editing && editing !== platform && draft) {
      if (isDirty(draft, policy[editing])) {
        const ok = await confirm({
          title: 'Discard changes?',
          body: 'You have unsaved changes on another platform. Discard them?',
          confirmLabel: 'Discard',
          destructive: true,
        });
        if (!ok) return;
      }
    }
    setEditing(platform);
    setDraft(emptyDraft(policy[platform]));
    onError('');
  };

  const cancelEdit = async (platform: PlatformKey) => {
    if (saving) return;
    if (draft && isDirty(draft, policy[platform])) {
      const ok = await confirm({
        title: 'Discard changes?',
        body: `Unsaved ${PLATFORM_LABELS[platform]} changes will be lost.`,
        confirmLabel: 'Discard',
        destructive: true,
      });
      if (!ok) return;
    }
    setEditing(null);
    setDraft(null);
    onError('');
  };

  const saveEdit = async (platform: PlatformKey) => {
    if (!canWrite || !draft || saving) return;
    const version = draft.latestVersion.trim();
    if (version && !VERSION_RE.test(version)) {
      onError('Version must look like 1.0.0');
      return;
    }
    if (!isDirty(draft, policy[platform])) {
      setEditing(null);
      setDraft(null);
      return;
    }

    const ok = await confirm({
      title: 'Save mobile app settings?',
      body: `Apply ${PLATFORM_LABELS[platform]} version and force-update settings?`,
      confirmLabel: 'Save',
    });
    if (!ok) return;

    setSaving(true);
    onError('');
    try {
      const next = await updateMobileAppSettings({
        [platform]: {
          latestVersion: version,
          forceUpdate: draft.forceUpdate,
          storeUrl: draft.storeUrl.trim(),
        },
      });
      onUpdated(next);
      setEditing(null);
      setDraft(null);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not save mobile app settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Version Management</h2>
      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={
            canWrite
              ? [undefined, undefined, undefined, undefined, 'text-right']
              : undefined
          }
          columns={
            canWrite
              ? ['Platform', 'Latest version', 'Force update', 'Store URL', 'Actions']
              : ['Platform', 'Latest version', 'Force update', 'Store URL']
          }>
          {(['android', 'ios'] as PlatformKey[]).map(platform => {
            const row = policy[platform];
            const isEditing = canWrite && editing === platform && draft != null;
            const display = isEditing ? draft : row;
            return (
              <tr
                key={platform}
                className={cn(
                  'border-b border-border last:border-0',
                  isEditing && 'bg-primary-soft/30',
                )}>
                <td className="px-4 py-3 align-middle">
                  <span className="font-medium text-foreground">
                    {PLATFORM_LABELS[platform]}
                  </span>
                </td>
                <td className="px-4 py-3 align-middle">
                  {isEditing ? (
                    <input
                      type="text"
                      className={tableInputClass}
                      value={display.latestVersion}
                      placeholder="e.g. 1.0.1"
                      disabled={saving}
                      onChange={e =>
                        setDraft(prev =>
                          prev ? {...prev, latestVersion: e.target.value} : prev,
                        )
                      }
                    />
                  ) : (
                    <span className="text-sm text-foreground">
                      {row.latestVersion || '—'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  {isEditing ? (
                    <FeatureSwitch
                      checked={display.forceUpdate}
                      disabled={saving}
                      label={`Force update for ${PLATFORM_LABELS[platform]}`}
                      onChange={() =>
                        setDraft(prev =>
                          prev ? {...prev, forceUpdate: !prev.forceUpdate} : prev,
                        )
                      }
                    />
                  ) : (
                    <span className="text-sm text-foreground">
                      {row.forceUpdate ? 'On' : 'Off'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  {isEditing ? (
                    <input
                      type="url"
                      className={cn(tableInputClass, 'max-w-md')}
                      value={display.storeUrl}
                      placeholder="https://…"
                      disabled={saving}
                      onChange={e =>
                        setDraft(prev =>
                          prev ? {...prev, storeUrl: e.target.value} : prev,
                        )
                      }
                    />
                  ) : (
                    <span className="block max-w-md truncate text-sm text-foreground">
                      {row.storeUrl || '—'}
                    </span>
                  )}
                </td>
                {canWrite ? (
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-nowrap justify-end gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className={actionButtonClass}
                            disabled={saving}
                            onClick={() => void cancelEdit(platform)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className={actionButtonClass}
                            disabled={saving}
                            onClick={() => void saveEdit(platform)}>
                            {saving ? 'Saving…' : 'Save'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(actionButtonClass, 'invisible pointer-events-none')}
                            tabIndex={-1}
                            aria-hidden>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={actionButtonClass}
                            disabled={
                              saving || (editing != null && editing !== platform)
                            }
                            onClick={() => void startEdit(platform)}>
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </DataTable>
      </div>
    </>
  );
}
