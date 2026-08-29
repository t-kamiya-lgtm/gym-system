import { NextResponse } from "next/server";
import { getCurrentPartner } from "@/lib/auth-partner";
import type { PartnerUser } from "@/lib/types";

export type PartnerRoleCheckResult =
  | { ok: true; partner: PartnerUser }
  | { ok: false; response: NextResponse };

export async function requirePartner(): Promise<PartnerRoleCheckResult> {
  const partner = await getCurrentPartner();
  if (!partner) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, partner };
}
