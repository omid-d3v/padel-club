"use client";
import {
  useEffect,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerPush, unregisterPush } from "@/app/push-actions";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const configured =
  Object.values(firebaseConfig).every(Boolean) &&
  !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
async function registerDevice() {
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] =
    await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  if (!(await isSupported())) throw new Error("UNSUPPORTED");
  const registration = await navigator.serviceWorker.register(
    "/rallyyar-messaging-sw.js",
  );
  const app =
    getApps().find((a) => a.name === "rallyyar-push") ??
    initializeApp(firebaseConfig, "rallyyar-push");
  const token = await getToken(getMessaging(app), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token || (await registerPush(token)).success !== true)
    throw new Error("REGISTRATION_FAILED");
}
export function PushOptIn({
  userId,
  settings = false,
}: {
  userId: string;
  settings?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false),
    [enabled, setEnabled] = useState(false),
    [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const visible = useSyncExternalStore(
    subscribeStorage,
    () => {
      if (
        !configured ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
      )
        return false;
      try {
        return (
          settings ||
          localStorage.getItem(`push-dismissed:${userId}`) !== "yes" ||
          Notification.permission === "granted"
        );
      } catch {
        return true;
      }
    },
    () => false,
  );
  useEffect(() => {
    if (
      !configured ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    )
      return;
    try {
      if (
        Notification.permission === "granted" &&
        localStorage.getItem(`push-enabled:${userId}`) === "yes"
      )
        registerDevice()
          .then(() => setEnabled(true))
          .catch(() =>
            setMessage("برای تازه‌سازی اتصال اعلان، دکمهٔ فعال‌کردن را بزنید."),
          );
    } catch {}
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "RALLYYAR_PUSH")
        toast(event.data.title, { description: event.data.body });
    };
    navigator.serviceWorker.addEventListener("message", listener);
    return () =>
      navigator.serviceWorker.removeEventListener("message", listener);
  }, [userId]);
  const enable = () =>
    start(async () => {
      setMessage("");
      try {
        if (Notification.permission === "denied") {
          setMessage(
            "اعلان در مرورگر مسدود است؛ از تنظیمات سایت در مرورگر اجازه بدهید.",
          );
          return;
        }
        if ((await Notification.requestPermission()) !== "granted") {
          setMessage(
            "اعلان فعال نشد؛ هر زمان خواستید می‌توانید دوباره انتخاب کنید.",
          );
          return;
        }
        await registerDevice();
        try {
          localStorage.setItem(`push-enabled:${userId}`, "yes");
        } catch {}
        setEnabled(true);
        setMessage(
          "اعلان این دستگاه فعال شد؛ تغییر زمان، عضو جدید و تأیید رزرو را خبر می‌دهیم.",
        );
      } catch {
        setMessage(
          "فعال‌سازی انجام نشد؛ تنظیمات مرورگر یا اتصال را بررسی و دوباره تلاش کنید.",
        );
      }
    });
  if (!visible || (dismissed && !settings)) return null;
  return (
    <aside className="platform-card my-4 space-y-3" aria-label="اعلان‌های رزرو">
      <h2 className="text-base font-bold">از تغییرات بازی و رزرو باخبر بمان</h2>
      <p className="text-sm leading-7">
        با اجازهٔ شما، تغییر ساعت، پیوستن بازیکن و قطعی‌شدن رزرو در این دستگاه
        نمایش داده می‌شود.
      </p>
      {message && (
        <p role="status" className="text-sm leading-7">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {enabled ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await unregisterPush();
                try {
                  localStorage.removeItem(`push-enabled:${userId}`);
                } catch {}
                setEnabled(false);
                setMessage("اعلان این دستگاه غیرفعال شد.");
              })
            }
          >
            غیرفعال‌کردن اعلان این دستگاه
          </Button>
        ) : (
          <Button disabled={pending} onClick={enable}>
            {pending ? "در حال فعال‌سازی…" : "فعال‌کردن اعلان‌ها"}
          </Button>
        )}
        {!settings && (
          <Button
            variant="ghost"
            onClick={() => {
              try {
                localStorage.setItem(`push-dismissed:${userId}`, "yes");
              } catch {}
              setDismissed(true);
            }}
          >
            فعلاً نه
          </Button>
        )}
      </div>
    </aside>
  );
}
