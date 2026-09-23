import type {ReactNode} from 'react';
import {cn} from '@/lib/cn';

export function DataTable({
  columns,
  children,
  footer,
  className,
  tableClassName,
  columnWidths,
  columnHeaderClassNames,
}: {
  columns: string[];
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  tableClassName?: string;
  columnWidths?: string[];
  columnHeaderClassNames?: (string | undefined)[];
}) {
  return (
    <div className={cn('overflow-x-auto overflow-y-hidden rounded-2xl border border-border bg-card', className)}>
      <table className={cn('w-full min-w-[640px] text-left text-sm', tableClassName)}>
        {columnWidths?.length ? (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={columns[index] ?? index} style={{width}} />
            ))}
          </colgroup>
        ) : null}
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            {columns.map((col, index) => (
              <th
                key={col}
                className={cn('px-4 py-3 font-semibold', columnHeaderClassNames?.[index])}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  );
}

export function FilterBar({children}: {children: ReactNode}) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}
