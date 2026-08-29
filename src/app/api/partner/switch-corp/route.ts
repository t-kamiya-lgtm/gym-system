import { NextResponse } from "next/server";
import { z } from "zod";
import { getPartnerMemberships, ACTIVE_CORP_COOKIE } from "@/lib/auth-partner";

const schema = z.object({ corporationId: z.string().uuid() });

/** 複数法人にログインが紐付いている場合の、表示対象法人の切り替え。 */
export async function POST(request: Request) {
  const memberships = await getPartnerMemberships();
  if (memberships.length === 0) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  if (!memberships.some((m) => m.corporationId === body.data.corporationId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_CORP_COOKIE, body.data.corporationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
