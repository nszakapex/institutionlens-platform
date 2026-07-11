import { z } from "zod";

const appModeSchema = z.enum(["local-demo"]);

const envSchema = z.object({
  IL_APP_MODE: appModeSchema,
  IL_DEMO_TENANT_ID: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "IL_DEMO_TENANT_ID must be lowercase alphanumeric with hyphens"),
  IL_DEMO_PRINCIPAL_ID: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "IL_DEMO_PRINCIPAL_ID must be lowercase alphanumeric with hyphens"),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

/**
 * Validates process environment for InstitutionLens.
 * Fail closed: only local-demo mode is accepted in Phase 0–1.
 * Never expose demo tenant/principal ids to client bundles.
 */
export function loadServerEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const parsed = envSchema.safeParse({
    IL_APP_MODE: source.IL_APP_MODE,
    IL_DEMO_TENANT_ID: source.IL_DEMO_TENANT_ID,
    IL_DEMO_PRINCIPAL_ID: source.IL_DEMO_PRINCIPAL_ID,
    NODE_ENV: source.NODE_ENV,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new EnvValidationError(
      `Invalid environment for InstitutionLens (fail closed). ${details}`,
    );
  }

  return parsed.data;
}

export function assertNoPublicSecrets(
  source: Record<string, string | undefined> = process.env,
): void {
  const forbiddenPrefixes = [
    "NEXT_PUBLIC_IL_DEMO",
    "NEXT_PUBLIC_IL_SECRET",
    "NEXT_PUBLIC_SUPABASE",
  ];
  for (const key of Object.keys(source)) {
    if (forbiddenPrefixes.some((prefix) => key.startsWith(prefix))) {
      throw new EnvValidationError(
        `Forbidden public env key "${key}". Demo tenant secrets must remain server-only.`,
      );
    }
  }
}
