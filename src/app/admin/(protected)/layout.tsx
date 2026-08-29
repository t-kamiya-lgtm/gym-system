import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOperator } from "@/lib/auth-operator";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const operator = await getCurrentOperator();

  if (!operator) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
          <Link href="/admin" className="shrink-0 text-sm font-semibold leading-tight hover:text-neutral-700">
            プロテインモンスター
            <br />
            オフィシャルパートナー
            <br />
            管理画面(運営側)
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm text-neutral-500 sm:inline">{operator.email}</span>
            <LogoutButton redirectTo="/admin/login" />
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto min-w-0 max-w-screen-2xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
