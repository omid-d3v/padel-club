"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
        <DialogPrimitive.Content
          dir="rtl"
          onCloseAutoFocus={(event) => {
            if (returnFocusRef?.current) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          className={`dialog-content fixed start-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] -translate-y-1/2 translate-x-1/2 overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 shadow-xl ${className || "max-w-md"}`}
        >
          <DialogPrimitive.Title className="pe-9 text-xl font-bold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mb-6 mt-2 text-sm leading-7 text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close
            className="absolute end-3 top-3 grid size-11 place-items-center rounded-xl hover:bg-muted"
            aria-label="بستن"
          >
            <X size={20} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
