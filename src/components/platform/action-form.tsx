"use client";
import { useState, useTransition } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { platformAction, type PlatformResult } from "@/app/platform-actions";
import { Dialog } from "@/components/ui/dialog";
export function ActionForm({
  operation,
  children,
  label = "ذخیره",
  className = "form-stack",
  confirm,
  action,
  disabled = false,
  buttonVariant = "default",
}: {
  operation?: string;
  children?: React.ReactNode;
  label?: string;
  className?: string;
  confirm?: string;
  action?: (form: FormData) => Promise<PlatformResult>;
  disabled?: boolean;
  buttonVariant?: ComponentProps<typeof Button>["variant"];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<PlatformResult | null>(null);
  const [confirmation, setConfirmation] = useState<FormData | null>(null);
  const run = (form: FormData) => {
    setConfirmation(null);
    start(async () => {
      try {
        const r = action
          ? await action(form)
          : await platformAction(operation ?? "", form);
        setResult(r);
        if (r.success) {
          toast.success(r.message);
          if (r.redirect) {
            if (
              r.redirect.startsWith("https://payment.zarinpal.com/") ||
              r.redirect.startsWith("https://sandbox.zarinpal.com/")
            )
              window.location.assign(r.redirect);
            else if (r.redirect.startsWith("/") && !r.redirect.startsWith("//"))
              router.push(r.redirect);
          } else router.refresh();
        } else toast.error(r.message);
      } catch {
        setResult({
          success: false,
          message: "اتصال برقرار نشد؛ دوباره تلاش کنید.",
        });
      }
    });
  };
  return (
    <>
      <form
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const f = new FormData(e.currentTarget);
          if (confirm) setConfirmation(f);
          else run(f);
        }}
      >
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
        {result && (
          <p
            role={result.success ? "status" : "alert"}
            className={`text-sm leading-7 ${result.success ? "text-emerald-800" : "text-red-700"}`}
          >
            {result.message}
          </p>
        )}
        <Button
          variant={buttonVariant}
          disabled={pending || disabled}
          className="w-full"
          type="submit"
        >
          {pending && <LoaderCircle size={17} className="animate-spin" />}
          {pending ? "در حال بررسی…" : label}
        </Button>
      </form>
      {confirm && (
        <Dialog
          open={confirmation !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmation(null);
          }}
          title="تأیید درخواست"
          description={confirm}
        >
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (confirmation) run(confirmation);
              }}
            >
              تأیید و ادامه
            </Button>
            <Button variant="outline" onClick={() => setConfirmation(null)}>
              بازگشت
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
