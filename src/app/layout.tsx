import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { siteUrl } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "پدل کلاب | زمین، هم‌بازی و رقابت",
    template: "%s | پدل کلاب",
  },
  description:
    "رزرو زمین پدل، پیدا کردن هم‌بازی هم‌سطح، امریکانو و مسابقات با قیمت شفاف و تأیید واقعی باشگاه.",
  openGraph: {
    locale: "fa_IR",
    siteName: "پدل کلاب",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
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
