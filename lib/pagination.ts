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

type PaginationOptions = {
  defaultPageSize?: number;
  pageSizeOptions?: readonly number[];
};

export function getPaginationState(
  params: PaginationSearchParams | undefined,
  options: PaginationOptions = {}
): PaginationState {
  const pageSizeOptions = options.pageSizeOptions ?? PAGE_SIZE_OPTIONS;
  const defaultPageSize = options.defaultPageSize ?? 10;
  const page = normalizePositiveInt(params?.page, 1);
  const requestedPageSize = normalizePositiveInt(
    params?.pageSize,
    defaultPageSize
  );
  const pageSize = pageSizeOptions.includes(requestedPageSize)
    ? requestedPageSize
    : defaultPageSize;
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
