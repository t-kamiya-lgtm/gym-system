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
    <div className="min-h-screen bg-sky-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-4">
          <Link href="/admin" className="min-w-0 truncate text-sm font-semibold hover:text-neutral-700 sm:text-base">
            <span className="sm:hidden">運営側管理画面</span>
            <span className="hidden sm:inline">
              プロテインモンスター オフィシャルパートナー ジムアフィリエイト管理システム(運営側)
            </span>
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
