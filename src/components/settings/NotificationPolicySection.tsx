'use client';

import {Fragment, useMemo, useState} from 'react';
import {ChevronDown, ChevronRight} from 'lucide-react';
import {
  isApiError,
  updateNotificationPolicySettings,
  type NotificationPolicyEvent,
  type NotificationPolicySettings,
  type NotifyChannel,
  type NotifyFrequencyField,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {useConfirm} from '@/components/ui/confirm';
import {cn} from '@/lib/cn';

const CHANNEL_LABELS: Record<NotifyChannel, string> = {
  inApp: 'In-app',
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const FREQUENCY_LABELS: Record<NotifyFrequencyField, string> = {
  maxPerStretch: 'Max per stretch',
  intervalHours: 'Interval (hours)',
  batchSize: 'Batch size',
  daysBefore: 'Days before expiry',
};

const GROUP_LABELS: Record<string, string> = {
  auth: 'Auth',
  account: 'Account',
  leads: 'Leads',
  verification: 'Verification',
  online: 'Online plans',
  support: 'Support',
  messages: 'Messages',
  admin: 'Admin',
};

const tableInputClass =
  'h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';

type EventDraft = {
  channels: Partial<Record<NotifyChannel, boolean>>;
  frequency: Partial<Record<NotifyFrequencyField, string>>;
};

const GROUP_ORDER = [
  'auth',
  'account',
  'leads',
  'verification',
  'online',
  'support',
  'messages',
  'admin',
] as const;

function ChannelCheckbox({
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
    <label
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-muted/40',
      )}>
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={() => onChange?.()}
      />
      <span>{label}</span>
    </label>
  );
}

function ChannelCheckboxGroup({
  channels,
  checkedFor,
  disabled,
  onToggle,
}: {
  channels: NotifyChannel[];
  checkedFor: (channel: NotifyChannel) => boolean;
  disabled?: boolean;
  onToggle?: (channel: NotifyChannel) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      {channels.map(ch => (
        <ChannelCheckbox
          key={ch}
          checked={checkedFor(ch)}
          disabled={disabled}
          label={CHANNEL_LABELS[ch]}
          onChange={onToggle ? () => onToggle(ch) : undefined}
        />
      ))}
    </div>
  );
}

function groupAllEvents(
  required: NotificationPolicyEvent[],
  optional: NotificationPolicyEvent[],
): Array<[string, NotificationPolicyEvent[]]> {
  const map = new Map<string, NotificationPolicyEvent[]>();
  for (const event of [...required, ...optional]) {
    const list = map.get(event.group) ?? [];
    list.push(event);
    map.set(event.group, list);
  }
  const ordered: Array<[string, NotificationPolicyEvent[]]> = [];
  for (const group of GROUP_ORDER) {
    const events = map.get(group);
    if (events?.length) ordered.push([group, events]);
    map.delete(group);
  }
  for (const [group, events] of map) {
    ordered.push([group, events]);
  }
  return ordered;
}

function buildDraft(event: NotificationPolicyEvent): EventDraft {
  const channels: Partial<Record<NotifyChannel, boolean>> = {};
  for (const ch of event.availableChannels) {
    channels[ch] = Boolean(event.channels[ch]);
  }
  const frequency: Partial<Record<NotifyFrequencyField, string>> = {};
  for (const field of event.availableFrequency) {
    frequency[field] = String(event.frequency?.[field] ?? '');
  }
  return {channels, frequency};
}

function isDraftDirty(event: NotificationPolicyEvent, draft: EventDraft): boolean {
  for (const ch of event.availableChannels) {
    if (Boolean(draft.channels[ch]) !== Boolean(event.channels[ch])) return true;
  }
  for (const field of event.availableFrequency) {
    const current = String(event.frequency?.[field] ?? '');
    if ((draft.frequency[field] ?? '') !== current) return true;
  }
  return false;
}

function GroupHeaderRow({
  title,
  count,
  open,
  colSpan,
  onToggle,
}: {
  title: string;
  count: number;
  open: boolean;
  colSpan: number;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-border bg-muted/50">
      <td colSpan={colSpan} className="px-4 py-2.5">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
          aria-expanded={open}
          onClick={onToggle}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{title}</span>
          <span className="font-normal text-muted-foreground">({count})</span>
        </button>
      </td>
    </tr>
  );
}

export function NotificationPolicySection({
  policy,
  canWrite,
  onUpdated,
  onError,
}: {
  policy: NotificationPolicySettings;
  canWrite: boolean;
  onUpdated: (next: NotificationPolicySettings) => void;
  onError: (message: string) => void;
}) {
  const confirm = useConfirm();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(
    () => groupAllEvents(policy.required, policy.optional),
    [policy.required, policy.optional],
  );
  const colSpan = canWrite ? 4 : 3;

  const isGroupOpen = (group: string) => openGroups[group] ?? false;

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !(prev[group] ?? false),
    }));
  };

  const startEdit = async (event: NotificationPolicyEvent) => {
    if (!canWrite || saving) return;
    if (editingKey && editingKey !== event.key && draft) {
      const current = policy.optional.find(e => e.key === editingKey);
      if (current && isDraftDirty(current, draft)) {
        const ok = await confirm({
          title: 'Discard changes?',
          body: 'You have unsaved changes on another notification. Discard them and edit this one?',
          confirmLabel: 'Discard',
          destructive: true,
        });
        if (!ok) return;
      }
    }
    setEditingKey(event.key);
    setDraft(buildDraft(event));
    onError('');
  };

  const cancelEdit = async (event: NotificationPolicyEvent) => {
    if (saving) return;
    if (draft && isDraftDirty(event, draft)) {
      const ok = await confirm({
        title: 'Discard changes?',
        body: `Unsaved changes for "${event.title}" will be lost.`,
        confirmLabel: 'Discard',
        destructive: true,
      });
      if (!ok) return;
    }
    setEditingKey(null);
    setDraft(null);
    onError('');
  };

  const toggleDraftChannel = (channel: NotifyChannel) => {
    if (!draft) return;
    setDraft({
      ...draft,
      channels: {
        ...draft.channels,
        [channel]: !Boolean(draft.channels[channel]),
      },
    });
  };

  const setDraftFrequency = (field: NotifyFrequencyField, value: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      frequency: {
        ...draft.frequency,
        [field]: value,
      },
    });
  };

  const saveEdit = async (event: NotificationPolicyEvent) => {
    if (!canWrite || !draft || saving) return;
    if (!isDraftDirty(event, draft)) {
      setEditingKey(null);
      setDraft(null);
      return;
    }

    const frequencyPatch: Partial<Record<NotifyFrequencyField, number>> = {};
    for (const field of event.availableFrequency) {
      const raw = draft.frequency[field] ?? '';
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        onError(`${FREQUENCY_LABELS[field]} must be a number.`);
        return;
      }
      frequencyPatch[field] = n;
    }

    const ok = await confirm({
      title: 'Save notification settings?',
      body: `Apply channel${event.availableFrequency.length ? ' and frequency' : ''} changes for "${event.title}"?`,
      confirmLabel: 'Save',
    });
    if (!ok) return;

    setSaving(true);
    onError('');
    try {
      const next = await updateNotificationPolicySettings({
        events: {
          [event.key]: {
            channels: draft.channels,
            ...(event.availableFrequency.length > 0 ? {frequency: frequencyPatch} : {}),
          },
        },
      });
      onUpdated(next);
      setEditingKey(null);
      setDraft(null);
    } catch (err) {
      onError(isApiError(err) ? err.message : 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const renderEventRow = (event: NotificationPolicyEvent) => {
    const locked = event.required;
    const isEditing = !locked && canWrite && editingKey === event.key && draft != null;
    const channelChecked = (ch: NotifyChannel) =>
      locked
        ? true
        : isEditing
          ? Boolean(draft.channels[ch])
          : Boolean(event.channels[ch]);
    const freqValue = (field: NotifyFrequencyField) =>
      isEditing
        ? (draft.frequency[field] ?? '')
        : String(event.frequency?.[field] ?? '');

    return (
      <tr
        key={event.key}
        className={cn(
          'border-b border-border last:border-0',
          isEditing && 'bg-primary-soft/30',
        )}>
        <td className="px-4 py-3 align-top">
          <p className="font-medium text-foreground">{event.title}</p>
          <p className="mt-1 whitespace-normal text-sm text-muted-foreground">
            {event.description}
          </p>
        </td>
        <td className="px-4 py-3 align-top">
          <ChannelCheckboxGroup
            channels={event.availableChannels}
            checkedFor={channelChecked}
            disabled={locked || !isEditing || saving}
            onToggle={isEditing ? toggleDraftChannel : undefined}
          />
        </td>
        <td className="px-4 py-3 align-top">
          {locked || event.availableFrequency.length === 0 ? (
            <span className="text-sm text-muted-foreground">On event</span>
          ) : (
            <div className="flex flex-col gap-2">
              {event.availableFrequency.map(field => (
                <label key={field} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{FREQUENCY_LABELS[field]}</span>
                  {isEditing ? (
                    <input
                      type="number"
                      className={tableInputClass}
                      value={freqValue(field)}
                      disabled={saving}
                      onChange={e => setDraftFrequency(field, e.target.value)}
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground">{freqValue(field)}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </td>
        {canWrite ? (
          <td className="px-4 py-3 align-top">
            {locked ? (
              <span className="block text-right text-sm text-muted-foreground">Locked</span>
            ) : (
              <div className="flex flex-nowrap justify-end gap-1">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className={actionButtonClass}
                      disabled={saving}
                      onClick={() => void cancelEdit(event)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className={actionButtonClass}
                      disabled={saving}
                      onClick={() => void saveEdit(event)}>
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
                      disabled={saving || (editingKey != null && editingKey !== event.key)}
                      onClick={() => void startEdit(event)}>
                      Edit
                    </Button>
                  </>
                )}
              </div>
            )}
          </td>
        ) : null}
      </tr>
    );
  };

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Notifications</h2>

      <div className="mb-8">
        <DataTable
          columnHeaderClassNames={
            canWrite ? [undefined, undefined, undefined, 'text-right'] : undefined
          }
          columns={
            canWrite
              ? ['Notification', 'Channels', 'Frequency', 'Actions']
              : ['Notification', 'Channels', 'Frequency']
          }>
          {groups.map(([group, events]) => {
            const open = isGroupOpen(group);
            return (
              <Fragment key={group}>
                <GroupHeaderRow
                  title={GROUP_LABELS[group] ?? group}
                  count={events.length}
                  open={open}
                  colSpan={colSpan}
                  onToggle={() => toggleGroup(group)}
                />
                {open ? events.map(event => renderEventRow(event)) : null}
              </Fragment>
            );
          })}
        </DataTable>
      </div>
    </>
  );
}
