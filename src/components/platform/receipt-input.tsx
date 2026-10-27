"use client";
import { useEffect, useState, useId } from "react";
export function ReceiptInput() {
  const id = useId();
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);
  return (
    <div className="space-y-3">
      <label
        htmlFor={id}
        className="field rounded-xl border border-dashed border-border p-4 cursor-pointer focus-within:ring-2 focus-within:ring-emerald-700"
      >
        <span className="font-bold">
          {file ? "تعویض عکس رسید" : "انتخاب عکس رسید واریز"}
        </span>
        <input
          id={id}
          className="sr-only"
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            setError("");
            setFile(null);
            setPreview("");
            if (!f) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
              f.size > 5242880
            ) {
              e.currentTarget.value = "";
              setError("عکس JPG، PNG یا WebP تا ۵ مگابایت انتخاب کنید.");
              return;
            }
            setFile(f);
            setPreview(URL.createObjectURL(f));
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {file && preview && (
        <figure>
          <p className="text-sm">
            {file.name} · {Math.ceil(file.size / 1024).toLocaleString("fa-IR")}{" "}
            کیلوبایت؛ برای تعویض، عکس دیگری انتخاب کنید.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="پیش‌نمایش رسید انتخاب‌شده؛ هنوز ارسال نشده"
            className="mt-3 max-h-72 max-w-full rounded-xl object-contain"
          />
        </figure>
      )}
    </div>
  );
}
