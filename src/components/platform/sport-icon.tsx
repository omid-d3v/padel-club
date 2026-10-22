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
  return (
    <svg
      viewBox="0 0 32 32"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {sport === "other" ? (
        <>
          <rect x="3" y="5" width="26" height="22" rx="2" />
          <path d="M16 5v22M3 16h26M7 5v22M25 5v22" />
        </>
      ) : sport === "badminton" ? (
        <>
          <path d="m8 21 1-17 7 2 7 6 5 7-16 7Z" />
          <path d="m9 4 3 18m4-16-4 16m11-10-11 10m16-3-16 3" />
          <path d="M8 21c-7 1-4 11 2 9l2-4" />
        </>
      ) : (
        <>
          <ellipse
            cx="20"
            cy="11"
            rx={sport === "squash" ? 6 : 8}
            ry="9"
            transform="rotate(35 20 11)"
          />
          <path d="m14 18-9 11-3-2 9-11" />
          {sport === "tennis" || sport === "squash" ? (
            <path d="m15 6 11 8M13 11l9 8m-3-17-9 13m16-10L15 21" />
          ) : (
            <>
              <circle cx="18" cy="7" r=".6" />
              <circle cx="23" cy="10" r=".6" />
              <circle cx="16" cy="12" r=".6" />
              <circle cx="21" cy="15" r=".6" />
            </>
          )}
          {sport === "beach_tennis" ? (
            <path d="M15 29q3-3 6 0t6 0" />
          ) : (
            <>
              <circle cx="26" cy="25" r="3" />
              <path d="m24 23 4 4" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
export function EquipmentIcon({ name }: { name: string }) {
  return /توپ|ball/i.test(name) ? (
    <svg
      viewBox="0 0 32 32"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="12" fill="#d7ff3f" />
      <path d="M8 7c14 5 5 12 16 18M8 25C19 19 10 12 24 7" />
    </svg>
  ) : (
    <SportIcon />
  );
}
