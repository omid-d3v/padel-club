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
            ? `/brand/matchsho/icon-${dark ? "on-dark" : "color"}.svg`
            : `/brand/matchsho/${variant === "lockup" ? "logo-stacked-bilingual" : `logo-${variant}-horizontal`}-${dark ? "dark" : "light"}.svg`
        }
        alt="مچ شو"
        width={compact ? 52 : 180}
        height={
          compact
            ? 52
            : variant === "lockup"
              ? 157
              : variant === "persian"
                ? 84
                : 51
        }
        className={compact ? "brand-mark" : "brand-wordmark"}
        priority
      />
    </span>
  );
}
