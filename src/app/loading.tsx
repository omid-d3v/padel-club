export default function Loading() {
  return (
    <div
      role="status"
      aria-label="در حال دریافت اطلاعات"
      className="mx-auto max-w-5xl space-y-5 p-8"
    >
      <p className="text-muted-foreground">در حال آماده‌کردن زمین…</p>
      <div className="h-12 w-1/2 animate-pulse rounded-xl bg-stone-200" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-stone-100"
          />
        ))}
      </div>
    </div>
  );
}
