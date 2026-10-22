"use client";
import { useState } from "react";
export function InviteButton({ title }: { title: string }) {
  const [status, setStatus] = useState("");
  async function invite() {
    try {
      if (navigator.share) await navigator.share({ title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
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
