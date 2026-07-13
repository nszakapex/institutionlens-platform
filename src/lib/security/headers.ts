export type SecurityHeader = {
  key: string;
  value: string;
};

export type CspOptions = {
  nonce?: string;
};

/**
 * Static security headers. CSP with nonce is applied in middleware.
 */
export function buildSecurityHeaders(options?: {
  includeContentSecurityPolicy?: boolean;
  nonce?: string;
}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    { key: "Referrer-Policy", value: "no-referrer" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];

  if (options?.includeContentSecurityPolicy) {
    headers.push({
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options.nonce ? { nonce: options.nonce } : {}),
    });
  }

  return headers;
}

/**
 * Builds the InstitutionLens CSP.
 *
 * `style-src 'unsafe-inline'` is intentionally present for Next.js App Router
 * inline style attributes in this scaffold. Do not add `unsafe-eval`, remote
 * font/image hosts, wildcard origins, or a broad `connect-src`. Documented in
 * SECURITY.md.
 */
export function buildContentSecurityPolicy(options: CspOptions = {}): string {
  const nonce = options.nonce;
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self'`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
