import Image from "next/image";
export function BrandLogo({
  compact = false,
  dark = false,
  variant = "persian",
}: {
  compact?: boolean;
  dark?: boolean;
  variant?: "persian" | "english" | "lockup";
}) {
  return (
    <span className={`brand-logo ${dark ? "brand-logo-light" : ""}`}>
      <Image
        src={
          compact
            ? "/brand/rallyyar-mark.png"
            : `/brand/rallyyar-${variant}.png`
        }
        alt="رالی‌یار"
        width={compact ? 52 : 180}
        height={compact ? 52 : 60}
        className={compact ? "brand-mark" : "brand-wordmark"}
        priority
      />
      {!compact && <span className="brand-signature">هم‌بازیِ هر رالی</span>}
    </span>
  );
}
