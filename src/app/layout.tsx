import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "پدل کلاب | مدیریت پدل", template: "%s | پدل کلاب" },
  description: "مدیریت مسابقات پدل، ثبت نتیجه و رتبه‌بندی بازیکنان",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-primary focus:p-4"
        >
          رفتن به محتوای اصلی
        </a>
        {children}
        <Toaster dir="rtl" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
