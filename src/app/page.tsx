import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold">プロテインモンスター オフィシャルパートナー ジムアフィリエイト管理システム</h1>
        <div className="flex flex-col gap-3 pt-4">
          <Link href="/admin/login" className="btn-primary">
            運営側(社内)ログイン
          </Link>
          <Link
            href="/partner/login"
            className="rounded-md border border-neutral-300 px-4 py-2 transition hover:bg-neutral-50"
          >
            法人パートナーログイン
          </Link>
        </div>
      </div>
    </main>
  );
}
