import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="p-12 text-center">
      <h1 className="text-2xl font-bold">این صفحه پیدا نشد</h1>
      <p className="my-4">
        نشانی را بررسی کنید؛ ممکن است صفحه جابه‌جا شده یا هنوز منتشر نشده باشد.
      </p>
      <Link href="/" className="text-emerald-700 underline">
        بازگشت به صفحهٔ اصلی
      </Link>
    </main>
  );
}
