"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton({ redirectTo, variant = "text" }: { redirectTo: string; variant?: "text" | "icon" }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push(redirectTo);
    router.refresh();
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        aria-label="ログアウト"
        title="ログアウト"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 transition hover:bg-neutral-50"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition hover:bg-neutral-50"
    >
      ログアウト
    </button>
  );
}
