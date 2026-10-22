import Image from "next/image";
export function PlayerAvatar({
  name,
  path,
  large = false,
}: {
  name: string;
  path?: string | null;
  large?: boolean;
}) {
  const url =
    path && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
      : null;
  return (
    <span className={`player-avatar ${large ? "player-avatar-large" : ""}`}>
      {url ? (
        <Image
          src={url}
          alt={`تصویر ${name}`}
          fill
          sizes={large ? "96px" : "64px"}
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join(" ") || "ر"}
        </span>
      )}
    </span>
  );
}
