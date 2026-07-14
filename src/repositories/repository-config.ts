import "server-only";

import { z } from "zod";
import { assertNoPublicSecrets, loadServerEnv } from "@/lib/env";
import { REPOSITORY_MAX_PAGE_SIZE } from "@/repositories/repository-contracts";

const ProductionModeSchema = z.enum(["development", "staging", "production"]);

export type ProductionRepositoryMode = z.infer<typeof ProductionModeSchema>;

export type LocalDemoRepositoryConfig = Readonly<{
  mode: "local-demo";
}>;

export type ProductionRepositoryConfig = Readonly<{
  mode: ProductionRepositoryMode;
  supabaseUrl: string;
  supabaseProjectRef: string;
  supabasePublishableKey: string;
  requestTimeoutMs: number;
  maxPageSize: number;
}>;

export type RepositoryConfig = LocalDemoRepositoryConfig | ProductionRepositoryConfig;

export type RepositoryConfigurationIssue =
  | "missing_mode"
  | "invalid_demo_configuration"
  | "demo_in_production"
  | "mixed_mode_configuration"
  | "missing_production_configuration"
  | "invalid_production_configuration"
  | "inconsistent_project_reference"
  | "public_credential_name"
  | "privileged_credential_present";

export class RepositoryConfigurationError extends Error {
  readonly code = "REPOSITORY_CONFIGURATION";
  readonly issues: readonly RepositoryConfigurationIssue[];

  constructor(issues: readonly RepositoryConfigurationIssue[]) {
    super("Repository configuration is invalid; data access denied.");
    this.name = "RepositoryConfigurationError";
    this.issues = Object.freeze([...new Set(issues)]);
  }
}

const projectRefSchema = z.string().regex(/^[a-z0-9]{20}$/);
const publishableKeySchema = z.string().min(20).max(512);
const timeoutSchema = z.coerce.number().int().min(100).max(30_000).default(5_000);
const pageSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(REPOSITORY_MAX_PAGE_SIZE)
  .default(REPOSITORY_MAX_PAGE_SIZE);

const productionKeyNames = [
  "IL_SUPABASE_URL",
  "IL_SUPABASE_PROJECT_REF",
  "IL_SUPABASE_PUBLISHABLE_KEY",
  "IL_REPOSITORY_REQUEST_TIMEOUT_MS",
  "IL_REPOSITORY_MAX_PAGE_SIZE",
] as const;

const privilegedCredentialNames = [
  ["IL_SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
  ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
  ["IL_SUPABASE", "ANON", "KEY"].join("_"),
  ["SUPABASE", "ANON", "KEY"].join("_"),
  "IL_DATABASE_URL",
] as const;

function hasValue(source: Record<string, string | undefined>, key: string): boolean {
  return typeof source[key] === "string" && source[key]!.length > 0;
}

function parseProductionUrl(value: string, projectRef: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== `${projectRef}.supabase.co` ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function loadRepositoryConfig(
  source: Record<string, string | undefined> = process.env,
): RepositoryConfig {
  try {
    assertNoPublicSecrets(source);
  } catch {
    throw new RepositoryConfigurationError(["public_credential_name"]);
  }

  if (privilegedCredentialNames.some((key) => hasValue(source, key))) {
    throw new RepositoryConfigurationError(["privileged_credential_present"]);
  }

  const mode = source.IL_APP_MODE;
  if (!mode) throw new RepositoryConfigurationError(["missing_mode"]);

  if (mode === "local-demo") {
    const issues: RepositoryConfigurationIssue[] = [];
    if (source.NODE_ENV === "production") issues.push("demo_in_production");
    if (productionKeyNames.some((key) => hasValue(source, key))) {
      issues.push("mixed_mode_configuration");
    }
    try {
      loadServerEnv(source);
    } catch {
      issues.push("invalid_demo_configuration");
    }
    if (issues.length > 0) throw new RepositoryConfigurationError(issues);
    return Object.freeze({ mode: "local-demo" });
  }

  const parsedMode = ProductionModeSchema.safeParse(mode);
  if (!parsedMode.success) {
    throw new RepositoryConfigurationError(["invalid_production_configuration"]);
  }

  if (hasValue(source, "IL_DEMO_TENANT_ID") || hasValue(source, "IL_DEMO_PRINCIPAL_ID")) {
    throw new RepositoryConfigurationError(["mixed_mode_configuration"]);
  }

  const projectRef = projectRefSchema.safeParse(source.IL_SUPABASE_PROJECT_REF);
  const publishableKey = publishableKeySchema.safeParse(source.IL_SUPABASE_PUBLISHABLE_KEY);
  const timeout = timeoutSchema.safeParse(source.IL_REPOSITORY_REQUEST_TIMEOUT_MS);
  const maxPageSize = pageSizeSchema.safeParse(source.IL_REPOSITORY_MAX_PAGE_SIZE);
  const rawUrl = source.IL_SUPABASE_URL;

  if (!rawUrl || !projectRef.success || !publishableKey.success) {
    throw new RepositoryConfigurationError(["missing_production_configuration"]);
  }
  const supabaseUrl = parseProductionUrl(rawUrl, projectRef.data);
  if (!supabaseUrl) {
    throw new RepositoryConfigurationError(["inconsistent_project_reference"]);
  }
  if (!timeout.success || !maxPageSize.success) {
    throw new RepositoryConfigurationError(["invalid_production_configuration"]);
  }

  return Object.freeze({
    mode: parsedMode.data,
    supabaseUrl,
    supabaseProjectRef: projectRef.data,
    supabasePublishableKey: publishableKey.data,
    requestTimeoutMs: timeout.data,
    maxPageSize: maxPageSize.data,
  });
}
