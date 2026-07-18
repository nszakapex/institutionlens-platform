import { z } from "zod";

const appModeSchema = z.enum(["local-demo", "development", "staging", "production"]);

const optionalHttpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), {
    message: "must be an https URL",
  })
  .optional();

const demoEnvSchema = z.object({
  IL_APP_MODE: z.literal("local-demo"),
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
  IL_FOUNDING_CONTACT_URL: optionalHttpsUrl,
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

const liveEnvSchema = z.object({
  IL_APP_MODE: z.enum(["development", "staging", "production"]),
  IL_SUPABASE_URL: z.string().url(),
  IL_SUPABASE_PROJECT_REF: z.string().regex(/^[a-z0-9]{20}$/),
  IL_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).max(512),
  IL_REPOSITORY_REQUEST_TIMEOUT_MS: z.string().optional(),
  IL_REPOSITORY_MAX_PAGE_SIZE: z.string().optional(),
  IL_FOUNDING_CONTACT_URL: optionalHttpsUrl,
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export type AppEnv =
  | z.infer<typeof demoEnvSchema>
  | (z.infer<typeof liveEnvSchema> & { IL_APP_MODE: "development" | "staging" | "production" });

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

/**
 * Validates process environment for InstitutionLens app bootstrap.
 * Explicit modes only — never silently coerces live → demo.
 * Repository cutover still uses `loadRepositoryConfig` for full fail-closed rules.
 */
export function loadServerEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const mode = source.IL_APP_MODE;
  if (!mode || !appModeSchema.safeParse(mode).success) {
    throw new EnvValidationError(
      "Invalid environment for InstitutionLens (fail closed). IL_APP_MODE: must be local-demo|development|staging|production",
    );
  }

  if (mode === "local-demo") {
    const parsed = demoEnvSchema.safeParse({
      IL_APP_MODE: source.IL_APP_MODE,
      IL_DEMO_TENANT_ID: source.IL_DEMO_TENANT_ID,
      IL_DEMO_PRINCIPAL_ID: source.IL_DEMO_PRINCIPAL_ID,
      IL_FOUNDING_CONTACT_URL: emptyToUndefined(source.IL_FOUNDING_CONTACT_URL),
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

  if (source.IL_DEMO_TENANT_ID || source.IL_DEMO_PRINCIPAL_ID) {
    throw new EnvValidationError(
      "Invalid environment for InstitutionLens (fail closed). Demo tenant ids must not be set in live modes.",
    );
  }

  const parsed = liveEnvSchema.safeParse({
    IL_APP_MODE: source.IL_APP_MODE,
    IL_SUPABASE_URL: source.IL_SUPABASE_URL,
    IL_SUPABASE_PROJECT_REF: source.IL_SUPABASE_PROJECT_REF,
    IL_SUPABASE_PUBLISHABLE_KEY: source.IL_SUPABASE_PUBLISHABLE_KEY,
    IL_REPOSITORY_REQUEST_TIMEOUT_MS: source.IL_REPOSITORY_REQUEST_TIMEOUT_MS,
    IL_REPOSITORY_MAX_PAGE_SIZE: source.IL_REPOSITORY_MAX_PAGE_SIZE,
    IL_FOUNDING_CONTACT_URL: emptyToUndefined(source.IL_FOUNDING_CONTACT_URL),
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

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Optional operator-controlled HTTPS contact/booking URL for founding access.
 * Never invent a default channel when unset.
 */
export function getFoundingContactUrl(
  source: Record<string, string | undefined> = process.env,
): string | undefined {
  try {
    const env = loadServerEnv(source);
    return "IL_FOUNDING_CONTACT_URL" in env ? env.IL_FOUNDING_CONTACT_URL : undefined;
  } catch {
    return undefined;
  }
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

export function isLiveAppMode(mode: AppEnv["IL_APP_MODE"]): boolean {
  return mode === "development" || mode === "staging" || mode === "production";
}
