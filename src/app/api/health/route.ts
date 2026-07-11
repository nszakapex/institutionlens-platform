import { NextResponse } from "next/server";
import { DemoTenantError, getDemoPrincipal } from "@/lib/demo-tenant";
import { buildHealthPayload } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Minimal safe health endpoint.
 * No database or external-service checks. No paths, versions, env, tenant ids,
 * timestamps, or stack details in the response body.
 */
export function GET() {
  try {
    const principal = getDemoPrincipal();
    const body = buildHealthPayload(principal);

    return NextResponse.json(body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof DemoTenantError ? "demo context unavailable" : "health check failed";

    return NextResponse.json(
      {
        status: "error",
        mode: "unavailable",
        synthetic: true,
        productionReady: false,
        error: message,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
