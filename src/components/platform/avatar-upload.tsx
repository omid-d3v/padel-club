"use client";
import { useState } from "react";
import { Camera, Upload } from "lucide-react";
export function AvatarUpload() {
  const [name, setName] = useState("");
  return (
    <label className="avatar-upload">
      <span className="member-stat-icon">
        <Camera size={23} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {name || "انتخاب تصویر جدید"}
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">
          JPG، PNG یا WebP · حداکثر ۲ مگابایت
        </span>
      </span>
      <Upload size={20} aria-hidden="true" />
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        aria-label="تصویر پروفایل؛ JPG، PNG یا WebP، حداکثر ۲ مگابایت"
        className="sr-only"
        onChange={(event) => setName(event.target.files?.[0]?.name ?? "")}
      />
    </label>
  );
}
