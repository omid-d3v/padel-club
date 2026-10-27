"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");
  return (
    <span>
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setMessage("کپی شد");
          } catch {
            setMessage("کپی خودکار انجام نشد؛ متن را انتخاب و کپی کنید.");
          }
        }}
      >
        {label}
      </Button>
      <span role="status" className="ms-3 text-sm">
        {message}
      </span>
    </span>
  );
}
