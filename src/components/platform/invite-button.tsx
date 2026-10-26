"use client";
import { useState } from "react";
export function InviteButton({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  const [status, setStatus] = useState("");
  async function invite() {
    const url = href ? new URL(href, location.origin).href : location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setStatus("لینک بازی کپی شد.");
      }
    } catch {
      setStatus(
        "اشتراک‌گذاری انجام نشد؛ می‌توانید نشانی همین صفحه را برای دوستان بفرستید.",
      );
    }
  }
  return (
    <div className="mt-5">
      <button
        type="button"
        className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
        onClick={invite}
      >
        دعوت دوستان به این بازی
      </button>
      <p role="status" className="mt-2 text-xs leading-6">
        {status}
      </p>
    </div>
  );
}
