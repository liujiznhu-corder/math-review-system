import Link from "next/link";
import { PAGE_SIZE_OPTIONS, getTotalPages } from "@/lib/pagination";

type PaginationProps = {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: readonly number[];
  showPageSizeSelector?: boolean;
};

export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  totalCount,
  pageSizeOptions,
  showPageSizeSelector = true
}: PaginationProps) {
  const options = pageSizeOptions ?? PAGE_SIZE_OPTIONS;
  const totalPages = getTotalPages(totalCount, pageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalCount, safePage * pageSize);

  return (
    <nav className="mt-6 flex flex-col gap-3 rounded-md border border-ink/10 bg-white px-4 py-4 text-sm text-ink/70 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <p>
        第 {start} - {end} 条，共 {totalCount} 条
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <PageLink
          href={buildPageHref(basePath, searchParams, 1, pageSize)}
          disabled={safePage <= 1}
        >
          首页
        </PageLink>
        <PageLink
          href={buildPageHref(basePath, searchParams, safePage - 1, pageSize)}
          disabled={safePage <= 1}
        >
          上一页
        </PageLink>
        <span className="rounded-md bg-paper px-3 py-2">
          {safePage} / {totalPages}
        </span>
        <PageLink
          href={buildPageHref(basePath, searchParams, safePage + 1, pageSize)}
          disabled={safePage >= totalPages}
        >
          下一页
        </PageLink>
        <PageLink
          href={buildPageHref(basePath, searchParams, totalPages, pageSize)}
          disabled={safePage >= totalPages}
        >
          末页
        </PageLink>

        {showPageSizeSelector ? (
          <form className="ml-0 flex items-center gap-2 lg:ml-2">
            {Object.entries(searchParams).map(([key, value]) =>
              value && key !== "page" && key !== "pageSize" ? (
                <input key={key} type="hidden" name={key} value={value} />
              ) : null
            )}
            <input type="hidden" name="page" value="1" />
            <select
              name="pageSize"
              defaultValue={pageSize}
              className="h-9 rounded-md border border-ink/15 bg-white px-2 text-sm outline-none focus:border-moss"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option} 条/页
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink"
            >
              应用
            </button>
          </form>
        ) : null}
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-ink/10 px-3 py-2 text-ink/35">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-ink hover:border-moss/40 hover:text-moss"
    >
      {children}
    </Link>
  );
}

function buildPageHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
  pageSize: number
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page" && key !== "pageSize") {
      params.set(key, value);
    }
  }

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return `${basePath}?${params.toString()}`;
}
