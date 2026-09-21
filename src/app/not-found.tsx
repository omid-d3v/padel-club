import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="p-12 text-center">
      <h1 className="text-2xl font-bold">این صفحه پیدا نشد</h1>
      <p className="my-4">
        ممکن است مسابقه هنوز پایان نیافته باشد یا آدرس درست نباشد.
      </p>
      <Link href="/" className="text-emerald-700 underline">
        بازگشت به داشبورد
      </Link>
    </main>
  );
}
