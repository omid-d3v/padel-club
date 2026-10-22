"use client";
import { useRef, useState, type ReactNode } from "react";
import { Plus, ArrowUpLeft } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
export function DetailPanel({
  title,
  description = "اطلاعات را بررسی و تغییرات را ذخیره کنید.",
  children,
  label = "جزئیات و مدیریت",
  initiallyOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  label?: string;
  initiallyOpen?: boolean;
}) {
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button
        type="button"
        className="admin-detail-button"
        ref={returnFocusRef}
        onClick={() => setOpen(true)}
      >
        {label.includes("افزودن") || label.includes("ساخت") ? (
          <Plus size={17} />
        ) : (
          <ArrowUpLeft size={17} />
        )}
        {label}
      </button>
      <Dialog
        returnFocusRef={returnFocusRef}
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        className="max-w-3xl"
      >
        {children}
      </Dialog>
    </>
  );
}
