"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/partner", label: "ダッシュボード" },
  { href: "/partner/orders", label: "注文一覧" },
  { href: "/partner/members", label: "会員別実績" },
  { href: "/partner/statements", label: "支払い明細" },
  { href: "/partner/settings", label: "設定" },
];

export function PartnerNav() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-neutral-100 bg-white">
      <div className="mx-auto flex max-w-screen-2xl gap-1 overflow-x-auto px-4 sm:px-6">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/partner" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2.5 text-sm ${
                active ? "border-b-2 border-neutral-900 font-medium" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
