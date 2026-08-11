import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

function storeRoot(): string {
  const override = process.env.IL_DOCUMENT_STORE_ROOT?.trim();
  if (override) return path.resolve(override);
  // Vercel serverless FS is ephemeral; keep demo vault off the read-only bundle root.
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "il-tenant-documents");
  }
  return path.join(process.cwd(), ".data", "tenant-documents");
}

function tenantDir(tenantId: string): string {
  return path.join(storeRoot(), tenantId.replace(/[^a-z0-9_-]/gi, "_"));
}

function indexPath(tenantId: string): string {
  return path.join(tenantDir(tenantId), "index.json");
}

export function ensureTenantDocumentStore(tenantId: string): void {
  const dir = tenantDir(tenantId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(indexPath(tenantId))) {
    writeFileSync(indexPath(tenantId), "[]\n", "utf8");
  }
}

export function readDocumentIndex<T>(tenantId: string): T[] {
  ensureTenantDocumentStore(tenantId);
  const raw = readFileSync(indexPath(tenantId), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as T[];
}

export function writeDocumentIndex<T>(tenantId: string, rows: readonly T[]): void {
  ensureTenantDocumentStore(tenantId);
  writeFileSync(indexPath(tenantId), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

export function writeDocumentBytes(
  tenantId: string,
  documentId: string,
  bytes: Uint8Array,
): { storageKey: string; checksumSha256: string } {
  ensureTenantDocumentStore(tenantId);
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `${tenantId}/${documentId}`;
  const filePath = path.join(tenantDir(tenantId), `${documentId}.bin`);
  writeFileSync(filePath, bytes);
  return { storageKey, checksumSha256 };
}

export function readDocumentBytes(tenantId: string, documentId: string): Uint8Array {
  const filePath = path.join(tenantDir(tenantId), `${documentId}.bin`);
  if (!existsSync(filePath)) {
    throw new Error("Document bytes missing.");
  }
  return new Uint8Array(readFileSync(filePath));
}

export function newDocumentId(): string {
  return `doc_${randomBytes(8).toString("hex")}`;
}
