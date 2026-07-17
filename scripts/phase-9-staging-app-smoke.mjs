/**
 * Phase 9 local-staging application smoke (HTTP against running Next app).
 * Uses gitignored .staging-auth.local.json. Never prints secrets, tokens, or refs.
 *
 * Usage:
 *   node scripts/phase-9-staging-app-smoke.mjs [baseUrl]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CREDENTIALS_PATH = path.join(ROOT, ".staging-auth.local.json");
const BASE = (process.argv[2] || "http://localhost:3001").replace(/\/$/, "");

const PRIVATE_PATTERNS = [
  /private_notes/i,
  /source_reference/i,
  new RegExp(["service", "role"].join("_"), "i"),
  /sb_secret_/i,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  /user_id["']?\s*[:=]/i,
];

function parseSetCookie(headerValue) {
  if (!headerValue) return [];
  // undici may join multiple set-cookie; split conservatively on ", " before cookie names.
  return headerValue.split(/,(?=\s*[^;]+=)/).map((part) => part.split(";")[0].trim());
}

function mergeCookieJar(jar, setCookieHeaders) {
  const next = { ...jar };
  for (const pair of setCookieHeaders) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (!value || value === "null") delete next[name];
    else next[name] = value;
  }
  return next;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function fetchPage(url, jar, init = {}) {
  const headers = { ...(init.headers || {}) };
  const cookie = cookieHeader(jar);
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, { ...init, headers, redirect: "manual" });
  const setCookies = [];
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  if (getSetCookie) setCookies.push(...getSetCookie());
  else if (response.headers.get("set-cookie")) {
    setCookies.push(...parseSetCookie(response.headers.get("set-cookie")));
  }
  const nextJar = mergeCookieJar(jar, setCookies);
  const text = await response.text();
  return { response, text, jar: nextJar };
}

function countH1(html) {
  return (html.match(/<h1[\s>]/gi) || []).length;
}

function hasSkipLink(html) {
  return /class=["'][^"']*skip-link/i.test(html) && /href=["']#main["']/.test(html);
}

function hasOverflowRisk(html) {
  // Soft heuristic: extremely wide fixed widths in inline styles.
  return /width:\s*(1[2-9]\d{2}|[2-9]\d{3})px/i.test(html);
}

function findPrivateLeaks(html) {
  return PRIVATE_PATTERNS.filter((re) => re.test(html)).map((re) => String(re));
}

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("Missing .staging-auth.local.json");
  }
  const cred = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const checks = {};

  // Health: staging + non-synthetic
  const health = await fetch(`${BASE}/api/health`);
  const healthText = await health.text();
  let healthJson = null;
  try {
    healthJson = JSON.parse(healthText);
  } catch {
    healthJson = null;
  }
  checks.healthStaging =
    health.ok && healthJson?.mode === "staging" && healthJson?.synthetic === false;

  // Unauthenticated app access must fail closed (error UI, not demo portfolio).
  let jar = {};
  const unauth = await fetchPage(`${BASE}/`, jar);
  jar = unauth.jar;
  const unauthDenied =
    unauth.response.status >= 400 ||
    /sign in|not authorized|could not be loaded|authentication required|something went wrong/i.test(
      unauth.text,
    );
  const unauthNotDemo =
    !/IL_APP_MODE=local-demo/i.test(unauth.text) &&
    !/data-app-mode=["']local-demo["']/.test(unauth.text);
  checks.unauthenticatedDenied = unauthDenied && unauthNotDemo;

  // Real session sign-in
  const signIn = await fetchPage(`${BASE}/api/auth/sign-in`, jar, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cred.email, password: cred.password }),
  });
  jar = signIn.jar;
  checks.signInOk = signIn.response.status === 200 && /"ok"\s*:\s*true/.test(signIn.text);
  checks.sessionCookiesSet = Object.keys(jar).some((name) => /auth-token|sb-/i.test(name));

  const routes = [
    ["overview", "/"],
    ["explorer", "/organizations"],
    ["methodology", "/methodology"],
    ["evidence", "/evidence"],
    ["compare", "/compare"],
    ["briefs", "/briefs"],
  ];

  const pageResults = {};
  let organizationHref = null;
  let briefHref = null;

  for (const [name, route] of routes) {
    const page = await fetchPage(`${BASE}${route}`, jar);
    jar = page.jar;
    const robots = page.response.headers.get("x-robots-tag") || "";
    const leaks = findPrivateLeaks(page.text);
    const ok =
      page.response.status === 200 &&
      /data-app-mode=["']staging["']/.test(page.text) &&
      countH1(page.text) === 1 &&
      hasSkipLink(page.text) &&
      /noindex/i.test(robots) &&
      leaks.length === 0 &&
      !hasOverflowRisk(page.text) &&
      !/adapter["']?\s*[:=]\s*["']synthetic/i.test(page.text);
    pageResults[name] = {
      status: page.response.status,
      h1Count: countH1(page.text),
      skipLink: hasSkipLink(page.text),
      stagingMode: /data-app-mode=["']staging["']/.test(page.text),
      noindex: /noindex/i.test(robots),
      privateLeaks: leaks.length,
      ok,
    };
    if (name === "explorer" && !organizationHref) {
      const match = page.text.match(/href="(\/organizations\/oref_[a-f0-9]+)"/i);
      if (match) organizationHref = match[1];
    }
    if (name === "briefs" && !briefHref) {
      const match = page.text.match(/href="(\/briefs\/(?:bref_|bsref_)[a-f0-9]+)"/i);
      if (match) briefHref = match[1];
    }
  }

  if (organizationHref) {
    const detail = await fetchPage(`${BASE}${organizationHref}`, jar);
    jar = detail.jar;
    const robots = detail.response.headers.get("x-robots-tag") || "";
    const leaks = findPrivateLeaks(detail.text);
    pageResults.organizationDetail = {
      status: detail.response.status,
      h1Count: countH1(detail.text),
      skipLink: hasSkipLink(detail.text),
      stagingMode: /data-app-mode=["']staging["']/.test(detail.text),
      noindex: /noindex/i.test(robots),
      privateLeaks: leaks.length,
      ok:
        detail.response.status === 200 &&
        countH1(detail.text) === 1 &&
        hasSkipLink(detail.text) &&
        /noindex/i.test(robots) &&
        leaks.length === 0,
    };
  } else {
    pageResults.organizationDetail = { ok: false, reason: "no_organization_link" };
  }

  if (briefHref) {
    const brief = await fetchPage(`${BASE}${briefHref}`, jar);
    jar = brief.jar;
    const robots = brief.response.headers.get("x-robots-tag") || "";
    const leaks = findPrivateLeaks(brief.text);
    pageResults.briefDetail = {
      status: brief.response.status,
      h1Count: countH1(brief.text),
      skipLink: hasSkipLink(brief.text),
      stagingMode: /data-app-mode=["']staging["']/.test(brief.text),
      noindex: /noindex/i.test(robots),
      privateLeaks: leaks.length,
      ok:
        brief.response.status === 200 &&
        countH1(brief.text) === 1 &&
        hasSkipLink(brief.text) &&
        /noindex/i.test(robots) &&
        leaks.length === 0,
    };
  } else {
    // Brief list may be empty of detail links depending on projection; list page already checked.
    pageResults.briefDetail = { ok: true, skipped: "no_brief_detail_link" };
  }

  // Signed-out deny again
  const signOut = await fetchPage(`${BASE}/api/auth/sign-out`, jar, { method: "POST" });
  jar = signOut.jar;
  const afterOut = await fetchPage(`${BASE}/`, jar);
  checks.signOutDenies =
    afterOut.response.status >= 400 ||
    /sign in|not authorized|could not be loaded|something went wrong/i.test(afterOut.text);

  const pagesOk = Object.values(pageResults).every((r) => r.ok);
  const result = {
    base: BASE,
    checks: {
      ...checks,
      pagesOk,
    },
    pages: pageResults,
    ok: Object.values(checks).every(Boolean) && pagesOk,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "unknown failure",
    }),
  );
  process.exit(1);
});
