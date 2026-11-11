'use client';

import {useState} from 'react';
import {Check, ChevronDown, Circle} from 'lucide-react';
import type {ProfileCompletionPayload} from '@/api';
import {cn} from '@/lib/cn';

type ChecklistItem = ProfileCompletionPayload['items'][number];

export function ProfileCompletionChecklist({
  percent,
  items,
  sectionLabels,
  fieldLabels,
}: {
  percent: number;
  items: ChecklistItem[];
  sectionLabels: Record<string, string>;
  fieldLabels: Record<string, string>;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    {},
  );

  function toggleSection(id: string) {
    setExpandedSections(prev => ({...prev, [id]: !prev[id]}));
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{width: `${percent}%`}}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {percent}%
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No checklist data.</p>
      ) : (
        <ul className="space-y-1">
          {items.map(section => {
            const fields = section.fields ?? [];
            const filledCount = fields.filter(f => f.done).length;
            const canExpand = fields.length > 0;
            const sectionOpen = Boolean(expandedSections[section.id]);

            return (
              <li key={section.id}>
                <button
                  type="button"
                  disabled={!canExpand}
                  aria-expanded={canExpand ? sectionOpen : undefined}
                  onClick={() => {
                    if (canExpand) toggleSection(section.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start text-sm',
                    canExpand && 'hover:bg-muted/60',
                    !canExpand && 'cursor-default',
                  )}>
                  {section.done ? (
                    <Check
                      className="size-4 shrink-0 text-primary"
                      strokeWidth={2.4}
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="size-4 shrink-0 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'flex-1 font-medium',
                      section.done ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                    {sectionLabels[section.id] ?? section.id}
                  </span>
                  {fields.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {filledCount}/{fields.length}
                    </span>
                  ) : null}
                  {canExpand ? (
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        sectionOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  ) : null}
                </button>

                {canExpand && sectionOpen ? (
                  <ul className="ms-8 space-y-1 pb-2 pe-2">
                    {fields.map(field => (
                      <li
                        key={field.id}
                        className="flex items-center gap-2 text-xs">
                        {field.done ? (
                          <Check
                            className="size-3.5 shrink-0 text-primary"
                            strokeWidth={2.4}
                            aria-hidden
                          />
                        ) : (
                          <Circle
                            className="size-3.5 shrink-0 text-muted-foreground/40"
                            aria-hidden
                          />
                        )}
                        <span
                          className={
                            field.done
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }>
                          {fieldLabels[field.id] ?? field.id}
                          {field.optional && !field.done ? (
                            <span className="ms-1 text-muted-foreground/70">
                              (optional)
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
