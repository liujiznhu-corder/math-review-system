export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type PaginationState = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
};

export type PaginationSearchParams = {
  page?: string;
  pageSize?: string;
};

export function getPaginationState(
  params: PaginationSearchParams | undefined
): PaginationState {
  const page = normalizePositiveInt(params?.page, 1);
  const requestedPageSize = normalizePositiveInt(params?.pageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number]
  )
    ? requestedPageSize
    : 10;
  const from = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    from,
    to: from + pageSize - 1
  };
}

export function getTotalPages(totalCount: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

function normalizePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
