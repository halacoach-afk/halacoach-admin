'use client';

import {FormEvent, useEffect, useMemo, useState} from 'react';
import {
  addLookupOption,
  getSettings,
  isApiError,
  updateLookupOption,
  updateSettings,
  type AppSettings,
  type LookupGroupMeta,
  type LookupOption,
  type SessionUser,
} from '@/api';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ErrorState} from '@/components/ui/ErrorState';
import {Input} from '@/components/ui/Input';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';

export function SettingsScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor.role, 'settings:write');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lookups, setLookups] = useState<LookupOption[]>([]);
  const [groups, setGroups] = useState<LookupGroupMeta[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [vatPercent, setVatPercent] = useState('5');
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getSettings();
      setSettings(payload.settings);
      setLookups(payload.lookups);
      setGroups(payload.groups);
      setVatPercent(String(payload.settings.vatRate * 100));
      setDrafts(Object.fromEntries(payload.lookups.map(item => [item.id, item.label])));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveConfig = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSavingConfig(true);
    setConfigMessage(null);
    setError(null);
    try {
      const next = await updateSettings({
        ...settings,
        vatRate: Number(vatPercent) / 100,
      });
      setSettings(next);
      setConfigMessage('App config saved.');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save app config.');
    } finally {
      setSavingConfig(false);
    }
  };

  const saveLabel = async (option: LookupOption) => {
    const label = drafts[option.id]?.trim();
    if (!label) {
      setError('Label cannot be empty.');
      return;
    }
    setError(null);
    try {
      const next = await updateLookupOption(option.id, {label});
      setLookups(list => list.map(item => (item.id === option.id ? next : item)));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update label.');
    }
  };

  const toggleActive = async (option: LookupOption) => {
    setError(null);
    try {
      const next = await updateLookupOption(option.id, {active: !option.active});
      setLookups(list => list.map(item => (item.id === option.id ? next : item)));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update option.');
    }
  };

  const addOption = async (groupId: LookupOption['groupId'], label: string) => {
    setError(null);
    try {
      const next = await addLookupOption({groupId, label});
      setLookups(list => [...list, next]);
      setDrafts(s => ({...s, [next.id]: next.label}));
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not add option.');
    }
  };

  const byGroup = useMemo(() => {
    const map = new Map<string, LookupOption[]>();
    for (const option of lookups) {
      const list = map.get(option.groupId) ?? [];
      list.push(option);
      map.set(option.groupId, list);
    }
    return map;
  }, [lookups]);

  if (loading) {
    return <LoadingState label="Loading settings…" />;
  }

  return (
    <>
      <PageHeader
        title="Settings"
        module="M2"
        description="Source of truth for matching questionnaire options and app config (OTP, VAT, phone prefix, max goals)."
      />

      {error ? <div className="mb-4"><ErrorState body={error} onRetry={() => void load()} /></div> : null}

      {settings ? (
        <Card className="mb-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">App config</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Matches `halacoach-app` env defaults. Super admins can edit. Client unlock cost is computed
            from match percentage at runtime (100% match = 50 credits).
          </p>
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={e => void saveConfig(e)}>
            <Input
              label="OTP length"
              type="number"
              min={4}
              max={8}
              value={settings.otpLength}
              disabled={!canWrite}
              onChange={e => setSettings({...settings, otpLength: Number(e.target.value)})}
            />
            <Input
              label="OTP resend (seconds)"
              type="number"
              min={10}
              max={120}
              value={settings.otpResendSeconds}
              disabled={!canWrite}
              onChange={e =>
                setSettings({...settings, otpResendSeconds: Number(e.target.value)})
              }
            />
            <Input
              label="Default phone prefix"
              value={settings.defaultPhonePrefix}
              disabled={!canWrite}
              onChange={e => setSettings({...settings, defaultPhonePrefix: e.target.value})}
            />
            <Input
              label="VAT (%)"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={vatPercent}
              disabled={!canWrite}
              onChange={e => setVatPercent(e.target.value)}
            />
            <Input
              label="Max goals a client can select"
              type="number"
              min={1}
              max={5}
              value={settings.maxGoals}
              disabled={!canWrite}
              onChange={e => setSettings({...settings, maxGoals: Number(e.target.value)})}
            />
            {canWrite ? (
              <div className="flex items-end">
                <Button type="submit" disabled={savingConfig}>
                  {savingConfig ? 'Saving…' : 'Save config'}
                </Button>
              </div>
            ) : (
              <p className="self-end text-sm text-muted-foreground">View only for your role.</p>
            )}
          </form>
          {configMessage ? (
            <p className="mt-3 text-sm text-primary">{configMessage}</p>
          ) : null}
        </Card>
      ) : null}

      <h2 className="mb-1 text-lg font-semibold text-foreground">Lookups</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Every option the mobile questionnaire and pro flow uses. Locked groups are system enums —
        you can rename labels, not add values.
      </p>

      <div className="space-y-3">
        {groups.map(group => (
          <LookupGroupCard
            key={group.id}
            group={group}
            options={(byGroup.get(group.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)}
            drafts={drafts}
            canWrite={canWrite}
            onDraft={(id, label) => setDrafts(s => ({...s, [id]: label}))}
            onSaveLabel={option => void saveLabel(option)}
            onToggle={option => void toggleActive(option)}
            onAdd={label => void addOption(group.id, label)}
          />
        ))}
      </div>
    </>
  );
}

function LookupGroupCard({
  group,
  options,
  drafts,
  canWrite,
  onDraft,
  onSaveLabel,
  onToggle,
  onAdd,
}: {
  group: LookupGroupMeta;
  options: LookupOption[];
  drafts: Record<number, string>;
  canWrite: boolean;
  onDraft: (id: number, label: string) => void;
  onSaveLabel: (option: LookupOption) => void;
  onToggle: (option: LookupOption) => void;
  onAdd: (label: string) => void;
}) {
  const [newLabel, setNewLabel] = useState('');

  return (
    <details className="rounded-2xl border border-border bg-card open:shadow-sm" open>
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">{group.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{group.hint}</p>
          </div>
          <div className="flex gap-2">
            <Badge>{options.length} options</Badge>
            {group.locked ? <Badge tone="warning">Locked enum</Badge> : null}
          </div>
        </div>
      </summary>
      <div className="border-t border-border px-5 py-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pb-2 font-semibold">Value</th>
                <th className="pb-2 font-semibold">Label</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {options.map(option => (
                <tr key={option.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs text-muted-foreground">{option.value}</td>
                  <td className="py-2">
                    <input
                      className="h-9 w-full max-w-md rounded-lg border border-border px-2 text-sm"
                      value={drafts[option.id] ?? option.label}
                      disabled={!canWrite}
                      onChange={e => onDraft(option.id, e.target.value)}
                    />
                  </td>
                  <td className="py-2">
                    <Badge tone={option.active ? 'primary' : 'danger'}>
                      {option.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-2 text-end">
                    {canWrite ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => onSaveLabel(option)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onToggle(option)}>
                          {option.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canWrite && !group.locked ? (
          <form
            className="mt-4 flex max-w-md gap-2"
            onSubmit={event => {
              event.preventDefault();
              if (!newLabel.trim()) {
                return;
              }
              onAdd(newLabel.trim());
              setNewLabel('');
            }}>
            <input
              className="h-10 flex-1 rounded-xl border border-border px-3 text-sm"
              placeholder="Add another option…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
            />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        ) : null}
      </div>
    </details>
  );
}
