/**
 * Convert legacy guide blocks/sections into HTML for the TipTap editor.
 * Keeps seeded CMS rows editable in a Word-like UI without data migration.
 */

type Block =
  | {type: 'paragraph'; text?: string}
  | {type: 'list'; items?: string[]}
  | {type: 'table'; headers?: string[]; rows?: string[][]}
  | {type: 'faq'; items?: {question?: string; answer?: string}[]}
  | Record<string, unknown>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function blockToHtml(block: Block): string {
  const type = typeof block.type === 'string' ? block.type : '';
  if (type === 'paragraph') {
    const text = typeof block.text === 'string' ? block.text : '';
    return text.trim() ? `<p>${escapeHtml(text)}</p>` : '';
  }
  if (type === 'list') {
    const items = Array.isArray(block.items) ? block.items : [];
    if (!items.length) return '';
    return `<ul>${items
      .map(item => `<li>${escapeHtml(String(item))}</li>`)
      .join('')}</ul>`;
  }
  if (type === 'table') {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];
    const thead = headers.length
      ? `<thead><tr>${headers
          .map(h => `<th>${escapeHtml(String(h))}</th>`)
          .join('')}</tr></thead>`
      : '';
    const tbody = `<tbody>${rows
      .map(
        row =>
          `<tr>${(Array.isArray(row) ? row : [])
            .map(cell => `<td>${escapeHtml(String(cell))}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody>`;
    return `<table>${thead}${tbody}</table>`;
  }
  if (type === 'faq') {
    const items = Array.isArray(block.items) ? block.items : [];
    return items
      .map(item => {
        const q = escapeHtml(String(item?.question ?? ''));
        const a = escapeHtml(String(item?.answer ?? ''));
        if (!q && !a) return '';
        return `<h3>${q}</h3><p>${a}</p>`;
      })
      .join('');
  }
  return '';
}

function blocksToHtml(blocks: unknown[]): string {
  return blocks
    .map(block =>
      block && typeof block === 'object'
        ? blockToHtml(block as Block)
        : '',
    )
    .filter(Boolean)
    .join('');
}

export function guideLocaleToHtml(locale: {
  html?: string;
  introBlocks?: unknown[];
  sections?: unknown[];
}): string {
  if (typeof locale.html === 'string' && locale.html.trim()) {
    return locale.html;
  }
  const intro = blocksToHtml(
    Array.isArray(locale.introBlocks) ? locale.introBlocks : [],
  );
  const sections = Array.isArray(locale.sections) ? locale.sections : [];
  const sectionHtml = sections
    .map(section => {
      if (!section || typeof section !== 'object') return '';
      const s = section as {heading?: string; blocks?: unknown[]};
      const heading = typeof s.heading === 'string' ? s.heading.trim() : '';
      const body = blocksToHtml(Array.isArray(s.blocks) ? s.blocks : []);
      const h = heading ? `<h2>${escapeHtml(heading)}</h2>` : '';
      return `${h}${body}`;
    })
    .join('');
  return `${intro}${sectionHtml}` || '<p></p>';
}
