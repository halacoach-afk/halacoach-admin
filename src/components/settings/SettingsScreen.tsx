'use client';

import {useEffect, useState} from 'react';
import {
  getSupportContactSettings,
  isApiError,
  updateSupportContactSettings,
  type SessionUser,
} from '@/api';
import {Button} from '@/components/ui/Button';
import {DataTable} from '@/components/ui/DataTable';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {cn} from '@/lib/cn';
import {can} from '@/lib/permissions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tableInputClass =
  'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary';
const tableCellClass = 'flex h-9 items-center';
const actionButtonClass = 'w-[4.75rem] shrink-0 justify-center';

function TableCell({children, className}: {children: React.ReactNode; className?: string}) {
  return <div className={cn(tableCellClass, className)}>{children}</div>;
}

export function SettingsScreen({actor}: {actor: SessionUser}) {
  const canWrite = can(actor, 'settings:write');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSupportContactSettings();
      setSupportEmail(data.supportEmail);
      setSupportPhone(data.supportPhone);
      setDraftEmail(data.supportEmail);
      setDraftPhone(data.supportPhone);
      setEditing(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = () => {
    setDraftEmail(supportEmail);
    setDraftPhone(supportPhone);
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setDraftEmail(supportEmail);
    setDraftPhone(supportPhone);
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!canWrite) {
      return;
    }
    const email = draftEmail.trim();
    const phone = draftPhone.trim();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid support email.');
      return;
    }
    if (phone.length < 5) {
      setError('Enter a valid support phone number.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await updateSupportContactSettings({
        supportEmail: email,
        supportPhone: phone,
      });
      setSupportEmail(next.supportEmail);
      setSupportPhone(next.supportPhone);
      setDraftEmail(next.supportEmail);
      setDraftPhone(next.supportPhone);
      setEditing(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading settings..." />;
  }

  if (error && !supportEmail && !supportPhone) {
    return <ErrorState body={error} onRetry={() => void load()} />;
  }

  const isEditing = canWrite && editing;
  const displayEmail = isEditing ? draftEmail : supportEmail;
  const displayPhone = isEditing ? draftPhone : supportPhone;

  return (
    <>
      <PageHeader
        title="Settings"
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
          View only - support contact settings require settings write access.
        </p>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Support contact</h2>
      <div className="mb-8">
        <DataTable
          tableClassName="table-fixed"
          columnWidths={canWrite ? ['38%', '38%', '24%'] : ['50%', '50%']}
          columnHeaderClassNames={
            canWrite ? [undefined, undefined, 'text-right'] : undefined
          }
          columns={canWrite ? ['Email', 'Phone', 'Actions'] : ['Email', 'Phone']}>
          <tr
            className={cn(
              'border-b border-border last:border-0',
              isEditing && 'bg-primary-soft/30',
            )}>
            <td className="px-4 py-2">
              <TableCell>
                {isEditing ? (
                  <input
                    type="email"
                    className={tableInputClass}
                    value={displayEmail}
                    onChange={event => setDraftEmail(event.target.value)}
                    autoComplete="off"
                    disabled={saving}
                  />
                ) : (
                  <span className="truncate font-medium text-foreground">{displayEmail}</span>
                )}
              </TableCell>
            </td>
            <td className="px-4 py-2">
              <TableCell>
                {isEditing ? (
                  <input
                    type="tel"
                    className={tableInputClass}
                    value={displayPhone}
                    onChange={event => setDraftPhone(event.target.value)}
                    autoComplete="off"
                    disabled={saving}
                  />
                ) : (
                  <span className="truncate text-foreground">{displayPhone}</span>
                )}
              </TableCell>
            </td>
            {canWrite ? (
              <td className="px-4 py-2">
                <TableCell className="flex-nowrap justify-end gap-1">
                  {isEditing ? (
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
                  {isEditing ? (
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
                </TableCell>
              </td>
            ) : null}
          </tr>
        </DataTable>
      </div>
    </>
  );
}
