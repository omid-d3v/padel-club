"use client";
import { useRef, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeSearch } from "@/lib/product";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Inbox,
  ArrowUpLeft,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { number } from "@/lib/utils";
export interface AdminListItem {
  id: string;
  title: string;
  meta: string;
  badge?: string;
  state?: string;
  search?: string;
  href?: string;
  content: ReactNode;
}
export function AdminList({
  title,
  description,
  items,
  toolbar,
  filters = [],
  pageSize = 8,
}: {
  title: string;
  description?: string;
  items: AdminListItem[];
  toolbar?: ReactNode;
  filters?: { value: string; label: string }[];
  pageSize?: number;
}) {
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const params = useSearchParams();
  const updateUrl = (patch: Record<string, string | null>) => {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(patch)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
  };
  // The URL is the single source of truth, including navigation between tabs.
  const query = params.get("q") ?? "";
  const filter = params.get("state") ?? "";
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const selected = params.get("record");
  const found = items.filter(
    (item) =>
      (!filter || item.state === filter) &&
      normalizeSearch(
        `${item.title} ${item.meta} ${item.id} ${item.search ?? ""}`,
      ).includes(normalizeSearch(query.trim())),
  );
  const pages = Math.max(1, Math.ceil(found.length / pageSize));
  const current = Math.min(page, pages);
  const visible = found.slice((current - 1) * pageSize, current * pageSize);
  const active = items.find((item) => item.id === selected);
  return (
    <section className="admin-list platform-card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2>
            {title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({number(items.length)})
            </span>
          </h2>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {toolbar}
      </div>
      <div className="admin-list-tools">
        <label className="admin-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label={`جست‌وجو در ${title}`}
            placeholder="نام، شناسه یا جزئیات…"
            value={query}
            onChange={(e) => {
              updateUrl({ q: e.target.value, page: null });
            }}
          />
        </label>
        {filters.length > 0 && (
          <label className="admin-filter">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <select
              aria-label={`فیلتر وضعیت ${title}`}
              value={filter}
              onChange={(e) => {
                updateUrl({ state: e.target.value, page: null });
              }}
            >
              <option value="">همه وضعیت‌ها</option>
              {filters.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="admin-records">
        {visible.map((item) => (
          <article
            key={item.id}
            data-record-id={item.id}
            className="admin-record"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-bold">{item.title}</h3>
                {item.badge && (
                  <span className="status-pill" data-status={item.state}>
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {item.meta}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                شناسه <bdi>{item.id.slice(0, 8)}</bdi>
              </p>
            </div>
            {item.href ? (
              <Link
                className="admin-detail-button"
                href={item.href}
                aria-label={`ویرایش ${item.title}`}
              >
                ویرایش <ArrowUpLeft size={17} />
              </Link>
            ) : (
              <button
                type="button"
                className="admin-detail-button"
                aria-label={`جزئیات ${item.title}`}
                onClick={(event) => {
                  returnFocusRef.current = event.currentTarget;

                  updateUrl({ record: item.id });
                }}
              >
                جزئیات و مدیریت <ArrowUpLeft size={17} aria-hidden="true" />
              </button>
            )}
          </article>
        ))}
        {!visible.length && (
          <div className="py-12 text-center text-muted-foreground">
            <Inbox className="mx-auto mb-4" size={32} />
            <p>
              {items.length
                ? "موردی با این جست‌وجو پیدا نشد."
                : "هنوز موردی ثبت نشده است."}
            </p>
            {(query || filter) && (
              <button
                type="button"
                className="mt-4 underline"
                onClick={() => {
                  updateUrl({ q: null, state: null, page: null });
                }}
              >
                پاک‌کردن فیلترها
              </button>
            )}
          </div>
        )}
      </div>
      <nav aria-label={`صفحه‌بندی ${title}`} className="admin-pagination">
        <p aria-live="polite">
          {number(found.length)} مورد · صفحه {number(current)} از{" "}
          {number(pages)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="صفحه قبل"
            disabled={current <= 1}
            onClick={() => {
              updateUrl({ page: String(current - 1) });
            }}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            aria-label="صفحه بعد"
            disabled={current >= pages}
            onClick={() => {
              updateUrl({ page: String(current + 1) });
            }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </nav>
      <Dialog
        returnFocusRef={returnFocusRef}
        open={!!active}
        onOpenChange={(open) => {
          if (!open) {
            updateUrl({ record: null });
          }
        }}
        title={active?.title ?? "جزئیات"}
        description={active?.meta ?? "اطلاعات و عملیات"}
        className="max-w-3xl"
      >
        {active && (
          <div className="admin-detail-content" key={active.id}>
            <p className="mb-5 rounded-xl bg-muted p-3 text-xs break-all">
              شناسه کامل: <bdi>{active.id}</bdi>
            </p>
            {active.content}
          </div>
        )}
      </Dialog>
    </section>
  );
}
