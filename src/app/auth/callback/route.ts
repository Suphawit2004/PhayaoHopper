import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site-url";

function redirectOrigin(request: NextRequest): string {
  const host = request.headers.get("host")?.toLowerCase();
  if (process.env.NODE_ENV !== "production" && host && /^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host)) {
    return `http://${host}`;
  }

  const configured = new URL(getSiteUrl());
  const trustedHosts = new Set([
    configured.host.toLowerCase(),
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase(),
    process.env.VERCEL_URL?.toLowerCase(),
  ]);
  return host && trustedHosts.has(host) ? `https://${host}` : configured.origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = redirectOrigin(request);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const isSafeRedirect =
    Boolean(nextParam) &&
    nextParam!.startsWith("/") &&
    !nextParam!.startsWith("//") &&
    !nextParam!.includes("\\");
  const next = isSafeRedirect ? nextParam! : "/";

  if (code) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
