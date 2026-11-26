'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {
  archiveCmsContent,
  createCmsContent,
  getCmsContent,
  isApiError,
  updateCmsContent,
  type CmsContentStatus,
  type CmsResourceGuideContent,
  type CmsResourceGuideLocale,
  type SessionUser,
} from '@/api';
import {CmsRichTextEditor} from '@/components/cms/CmsRichTextEditor';
import {guideLocaleToHtml} from '@/components/cms/guideBlocksToHtml';
import {Button} from '@/components/ui/Button';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {ErrorState} from '@/components/ui/ErrorState';
import {LoadingState} from '@/components/ui/LoadingState';
import {PageHeader} from '@/components/ui/PageHeader';
import {can} from '@/lib/permissions';

type SourceRow = {label: string; href: string};

const emptyLocale = (): CmsResourceGuideLocale => ({
  title: '',
  summary: '',
  html: '<p></p>',
  introBlocks: [],
  sections: [],
  sources: [],
});

const emptyContent = (): CmsResourceGuideContent => ({
  audience: 'client',
  en: emptyLocale(),
  ar: emptyLocale(),
});

const fieldClass =
  'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';
const labelClass = 'text-sm font-medium text-foreground';

function sourcesFromLocale(locale?: CmsResourceGuideLocale): SourceRow[] {
  const raw = Array.isArray(locale?.sources) ? locale!.sources : [];
  const rows = raw
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const row = item as {label?: string; href?: string};
      return {
        label: typeof row.label === 'string' ? row.label : '',
        href: typeof row.href === 'string' ? row.href : '',
      };
    })
    .filter((row): row is SourceRow => Boolean(row));
  return rows.length ? rows : [{label: '', href: ''}];
}

export function CmsGuideEditScreen({
  actor,
  id,
}: {
  actor: SessionUser;
  id: number | 'new';
}) {
  const router = useRouter();
  const canWrite = can(actor, 'cms:write');
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<CmsContentStatus>('draft');
  const [audience, setAudience] = useState<'client' | 'professional'>('client');
  const [legacySlug, setLegacySlug] = useState('');
  const [enTitle, setEnTitle] = useState('');
  const [enSummary, setEnSummary] = useState('');
  const [arTitle, setArTitle] = useState('');
  const [arSummary, setArSummary] = useState('');
  const [enHtml, setEnHtml] = useState('<p></p>');
  const [arHtml, setArHtml] = useState('<p></p>');
  const [enSources, setEnSources] = useState<SourceRow[]>([{label: '', href: ''}]);
  const [arSources, setArSources] = useState<SourceRow[]>([{label: '', href: ''}]);
  const [editorReady, setEditorReady] = useState(isNew);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setEditorReady(false);
      setError('');
      try {
        const row = await getCmsContent(id);
        if (cancelled) return;
        const content = (row.content ?? emptyContent()) as CmsResourceGuideContent;
        setStatus(row.status);
        setAudience(content.audience === 'professional' ? 'professional' : 'client');
        setLegacySlug(content.legacySlug ?? '');
        setEnTitle(content.en?.title ?? '');
        setEnSummary(content.en?.summary ?? '');
        setArTitle(content.ar?.title ?? '');
        setArSummary(content.ar?.summary ?? '');
        setEnHtml(guideLocaleToHtml(content.en ?? {}));
        setArHtml(guideLocaleToHtml(content.ar ?? {}));
        setEnSources(sourcesFromLocale(content.en));
        setArSources(sourcesFromLocale(content.ar));
        setEditorReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(isApiError(err) ? err.message : 'Failed to load guide.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  function cleanSources(rows: SourceRow[]) {
    return rows
      .map(row => ({
        label: row.label.trim(),
        ...(row.href.trim() ? {href: row.href.trim()} : {}),
      }))
      .filter(row => row.label);
  }

  async function onSave() {
    if (!canWrite) return;
    setSaving(true);
    setError('');
    try {
      const content: CmsResourceGuideContent = {
        audience,
        ...(legacySlug.trim() ? {legacySlug: legacySlug.trim()} : {}),
        en: {
          title: enTitle,
          summary: enSummary,
          html: enHtml,
          introBlocks: [],
          sections: [],
          sources: cleanSources(enSources),
        },
        ar: {
          title: arTitle,
          summary: arSummary,
          html: arHtml,
          introBlocks: [],
          sections: [],
          sources: cleanSources(arSources),
        },
      };

      if (isNew) {
        const created = await createCmsContent({
          type: 'resource_guide',
          status,
          content: content as unknown as Record<string, unknown>,
        });
        router.replace(`/cms/${created.id}`);
        return;
      }

      await updateCmsContent(id, {
        status,
        content: content as unknown as Record<string, unknown>,
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to save guide.');
    } finally {
      setSaving(false);
    }
  }

  async function onArchive() {
    if (!canWrite || isNew) return;
    setSaving(true);
    try {
      await archiveCmsContent(id);
      setStatus('archived');
      setArchiveOpen(false);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to archive guide.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !editorReady) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'New resource guide' : `Guide #${id}`}
        description="Compose with the Word-like editor. Public URL: /resources-and-guides/{id}"
        actions={
          <Link href="/cms">
            <Button variant="outline">Back</Button>
          </Link>
        }
      />

      {error ? <ErrorState body={error} /> : null}

      {!isNew ? (
        <p className="text-sm text-muted-foreground">
          Public path:{' '}
          <span className="font-mono text-foreground">
            /resources-and-guides/{id}
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Status</span>
          <select
            className={fieldClass}
            value={status}
            disabled={!canWrite}
            onChange={e => setStatus(e.target.value as CmsContentStatus)}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Audience</span>
          <select
            className={fieldClass}
            value={audience}
            disabled={!canWrite}
            onChange={e =>
              setAudience(e.target.value as 'client' | 'professional')
            }>
            <option value="client">client</option>
            <option value="professional">professional</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">English</h2>
          <label className="block">
            <span className={labelClass}>Title</span>
            <input
              className={fieldClass}
              value={enTitle}
              disabled={!canWrite}
              onChange={e => setEnTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Summary</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={enSummary}
              disabled={!canWrite}
              onChange={e => setEnSummary(e.target.value)}
            />
          </label>
          <div>
            <span className={labelClass}>Body</span>
            <div className="mt-1">
              <CmsRichTextEditor
                value={enHtml}
                onChange={setEnHtml}
                disabled={!canWrite}
                dir="ltr"
                placeholder="Write the guide content…"
              />
            </div>
          </div>
          <SourcesEditor
            label="Sources"
            rows={enSources}
            disabled={!canWrite}
            onChange={setEnSources}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground">Arabic</h2>
          <label className="block">
            <span className={labelClass}>Title</span>
            <input
              className={fieldClass}
              value={arTitle}
              disabled={!canWrite}
              onChange={e => setArTitle(e.target.value)}
              dir="rtl"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Summary</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={arSummary}
              disabled={!canWrite}
              onChange={e => setArSummary(e.target.value)}
              dir="rtl"
            />
          </label>
          <div>
            <span className={labelClass}>Body</span>
            <div className="mt-1">
              <CmsRichTextEditor
                value={arHtml}
                onChange={setArHtml}
                disabled={!canWrite}
                dir="rtl"
                placeholder="اكتب محتوى الدليل…"
              />
            </div>
          </div>
          <SourcesEditor
            label="Sources"
            rows={arSources}
            disabled={!canWrite}
            onChange={setArSources}
            rtl
          />
        </section>
      </div>

      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {!isNew ? (
            <Button
              variant="outline"
              disabled={saving || status === 'archived'}
              onClick={() => setArchiveOpen(true)}>
              Archive
            </Button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={archiveOpen}
        title="Archive guide?"
        body="Archived guides are hidden from the public site. The numeric id is kept."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          void onArchive();
        }}
        onClose={() => {
          if (!saving) setArchiveOpen(false);
        }}
      />
    </div>
  );
}

function SourcesEditor({
  label,
  rows,
  disabled,
  onChange,
  rtl,
}: {
  label: string;
  rows: SourceRow[];
  disabled?: boolean;
  onChange: (rows: SourceRow[]) => void;
  rtl?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={labelClass}>{label}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...rows, {label: '', href: ''}])}>
          Add source
        </Button>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className={fieldClass}
            placeholder="Label"
            value={row.label}
            disabled={disabled}
            dir={rtl ? 'rtl' : 'ltr'}
            onChange={e => {
              const next = [...rows];
              next[index] = {...next[index], label: e.target.value};
              onChange(next);
            }}
          />
          <input
            className={fieldClass}
            placeholder="https://"
            value={row.href}
            disabled={disabled}
            onChange={e => {
              const next = [...rows];
              next[index] = {...next[index], href: e.target.value};
              onChange(next);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || rows.length <= 1}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
