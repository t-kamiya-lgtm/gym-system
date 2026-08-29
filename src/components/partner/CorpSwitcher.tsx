"use client";

import { useRouter } from "next/navigation";

export function CorpSwitcher({
  corporations,
  activeCorporationId,
}: {
  corporations: { id: string; name: string }[];
  activeCorporationId: string;
}) {
  const router = useRouter();

  async function handleChange(corporationId: string) {
    await fetch("/api/partner/switch-corp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corporationId }),
    });
    router.push("/partner");
    router.refresh();
  }

  return (
    <select
      value={activeCorporationId}
      onChange={(e) => handleChange(e.target.value)}
      className="input w-auto text-sm"
      aria-label="表示する法人を切り替え"
    >
      {corporations.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
