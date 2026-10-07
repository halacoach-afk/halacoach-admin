export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
  counts?: Record<string, number>;
};

export const DEFAULT_PER_PAGE = 20;

export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export function emptyPaginationMeta(page = 1, perPage = DEFAULT_PER_PAGE): PaginationMeta {
  return {page, perPage, total: 0, lastPage: 1};
}

export function buildListQuery(params: {
  page?: number;
  perPage?: number;
  q?: string;
  [key: string]: string | number | undefined | null;
}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
