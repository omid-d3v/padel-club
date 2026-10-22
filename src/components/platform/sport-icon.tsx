import type { SVGProps } from "react";
export const SPORTS = [
  { id: "padel", name: "پدل" },
  { id: "tennis", name: "تنیس" },
  { id: "beach_tennis", name: "تنیس ساحلی" },
  { id: "squash", name: "اسکواش" },
  { id: "badminton", name: "بدمینتون" },
  { id: "other", name: "سایر" },
];
export function SportIcon({
  sport = "padel",
  ...props
}: SVGProps<SVGSVGElement> & { sport?: string }) {
  if (sport === "badminton" || sport === "other")
    return (
      <svg
        viewBox="0 0 48 48"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        {...props}
      >
        {sport === "badminton" ? (
          <>
            <path d="m12 30 1-24 10 3 10 9 8 9-23 10Z" fill="#d7ff3f" />
            <path d="m13 6 5 25M23 9l-5 22m15-13-15 13m23-4-23 4" />
            <path d="M12 30c-11 1-7 15 2 12l4-5Z" fill="#0f5d3a" />
          </>
        ) : (
          <>
            <rect x="4" y="8" width="40" height="32" rx="3" fill="#d7ff3f" />
            <path d="M24 8v32M4 24h40M10 8v32M38 8v32" />
          </>
        )}
      </svg>
    );
  return (
    <svg
      viewBox="0 0 48 48"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <ellipse
        cx="28"
        cy="17"
        rx={sport === "squash" ? 8 : 11}
        ry="13"
        transform="rotate(35 28 17)"
        fill="#d7ff3f"
      />
      <path d="m20 28-10 14-4-3 10-15" strokeWidth="3" />
      {sport === "tennis" ? (
        <path d="m21 8 15 12M18 14l16 12M25 5 13 24m20-16-14 21" />
      ) : (
        <>
          <circle cx="26" cy="12" r="1" />
          <circle cx="32" cy="16" r="1" />
          <circle cx="23" cy="20" r="1" />
          <circle cx="28" cy="24" r="1" />
        </>
      )}
      <circle cx="39" cy="38" r="5" fill="#d7ff3f" />
      {sport === "beach_tennis" && <path d="M3 46q8-5 16 0t18 0" />}
    </svg>
  );
}
export function EquipmentIcon({ name }: { name: string }) {
  return /توپ|ball/i.test(name) ? (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="#d7ff3f"
        stroke="#0f5d3a"
        strokeWidth="2"
      />
      <path
        d="M12 10q25 10 24 28M10 34q10-24 27-22"
        fill="none"
        stroke="#0f5d3a"
        strokeWidth="2"
      />
    </svg>
  ) : (
    <SportIcon />
  );
}
