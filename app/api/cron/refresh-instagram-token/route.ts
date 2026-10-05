import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  ensureFreshInstagramToken,
  loadInstagramGraphAccount,
} from "@/lib/social/instagram-graph";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const account = await loadInstagramGraphAccount();
    if (!account) {
      console.error("Instagram cron: no enabled social_accounts row is available.");
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    await ensureFreshInstagramToken(account);
    return NextResponse.json({ ok: true });
  } catch {
    console.error("Instagram cron: token freshness check failed.");
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
