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
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-semibold hover:text-neutral-700">
            ジムアフィリエイト管理システム(運営側)
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">{operator.email}</span>
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
