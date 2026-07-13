import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security/headers";

describe("security headers", () => {
  it("includes strict baseline headers", () => {
    const headers = buildSecurityHeaders({ includeContentSecurityPolicy: false });
    const map = Object.fromEntries(headers.map((header) => [header.key, header.value]));

    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["X-Robots-Tag"]).toBe("noindex, nofollow, noarchive");
    expect(map["Referrer-Policy"]).toBe("no-referrer");
    expect(map["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(map["Content-Security-Policy"]).toBeUndefined();
  });

  it("builds a restrictive self-hosted CSP with nonce", () => {
    const csp = buildContentSecurityPolicy({ nonce: "test-nonce" });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("cdn.");
    expect(csp).not.toContain("googleapis");
    expect(csp).not.toContain("googletagmanager");
  });

  it("forbids CSP relaxations that would reopen supply-chain or XSS paths", () => {
    const csp = buildContentSecurityPolicy({ nonce: "test-nonce" });

    expect(csp).not.toMatch(/unsafe-eval/);
    expect(csp).not.toMatch(/script-src[^;]*\*/);
    expect(csp).not.toMatch(/font-src[^;]*https:/);
    expect(csp).not.toMatch(/img-src[^;]*https:/);
    expect(csp).not.toMatch(/connect-src[^;]*\*/);
    expect(csp).not.toMatch(/connect-src[^;]*https:/);
    // Scripts must remain nonce-based; styles may use unsafe-inline (documented).
    expect(csp).toMatch(/script-src 'self' 'nonce-/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
