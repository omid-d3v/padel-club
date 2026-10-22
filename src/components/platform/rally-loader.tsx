export function RallyLoader() {
  return (
    <div
      role="status"
      aria-label="در حال دریافت اطلاعات"
      className="rally-loader"
    >
      <div className="rally-bounce-scene" aria-hidden="true">
        <div className="rally-bounce-shadow" />
        <div className="rally-bounce-ball">
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill="currentColor" />
            <path
              d="M13 7c16 13 16 37 0 50M51 7c-16 13-16 37 0 50"
              stroke="#0f5d3a"
              strokeWidth="3"
            />
          </svg>
        </div>
        <div className="rally-impact-ring" />
        <div className="rally-court-line" />
      </div>
      <p className="mt-2 text-sm font-semibold text-emerald-900">
        یک لحظه تا رالی بعدی
      </p>
      <span className="mt-2 text-xs text-muted-foreground">
        در حال دریافت اطلاعات
      </span>
    </div>
  );
}
