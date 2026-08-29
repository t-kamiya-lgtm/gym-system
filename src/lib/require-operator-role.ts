import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth-operator";
import type { OperatorUser } from "@/lib/types";

export type OperatorRoleCheckResult =
  | { ok: true; operator: OperatorUser }
  | { ok: false; response: NextResponse };

/** admin/staff(法人・店舗の登録・閲覧)を要求する */
export async function requireOperator(): Promise<OperatorRoleCheckResult> {
  const operator = await getCurrentOperator();
  if (!operator) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, operator };
}

/** admin(パートナーログイン発行・手動調整などの重要操作)を要求する */
export async function requireOperatorAdmin(): Promise<OperatorRoleCheckResult> {
  const operator = await getCurrentOperator();
  if (!operator) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (operator.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, operator };
}
