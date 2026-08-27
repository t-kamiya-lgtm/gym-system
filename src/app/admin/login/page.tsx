"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  async function handleGoogleLogin() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: process.env.NEXT_PUBLIC_ADMIN_ALLOWED_GOOGLE_DOMAIN ?? "",
        },
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">運営側管理画面ログイン</h1>
        <button type="button" onClick={handleGoogleLogin} className="btn-primary w-full">
          Googleでログイン
        </button>
        <p className="mt-4 text-center text-xs text-neutral-500">
          自社ドメインのGoogleアカウントでのみログインできます。
        </p>
      </div>
    </main>
  );
}
