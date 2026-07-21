import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const base = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        frontend: "ok",
        backend_url: base,
        backend_status: res.status,
        backend: data,
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        frontend: "ok",
        backend_url: base,
        backend_status: 0,
        detail: err instanceof Error ? err.message : "Backend unreachable",
      },
      { status: 502 }
    );
  }
}
