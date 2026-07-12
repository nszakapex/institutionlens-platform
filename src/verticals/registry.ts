import "server-only";

import type { AdapterVersion, VerticalId } from "@/domain/ids";
import { AdapterVersionSchema, VerticalIdSchema } from "@/domain/ids";
import {
  UnsupportedAdapterVersionError,
  UnsupportedVerticalError,
  ValidationError,
} from "@/domain/errors";
import type { VerticalAdapter } from "@/verticals/contract";
import { financialInstitutionsAdapter } from "@/verticals/financial-institutions";

/**
 * Explicit allowlist — never filesystem discovery or dynamic imports.
 */
const ADAPTERS: readonly VerticalAdapter[] = [financialInstitutionsAdapter];

function key(id: VerticalId, version: AdapterVersion): string {
  return `${id}@${version}`;
}

const BY_KEY = new Map(ADAPTERS.map((adapter) => [key(adapter.id, adapter.version), adapter]));

export function listRegisteredAdapters(): readonly Pick<
  VerticalAdapter,
  "id" | "version" | "displayName"
>[] {
  return ADAPTERS.map((adapter) =>
    Object.freeze({
      id: adapter.id,
      version: adapter.version,
      displayName: adapter.displayName,
    }),
  );
}

export function resolveAdapter(verticalId: string, adapterVersion: string): VerticalAdapter {
  let id: VerticalId;
  let version: AdapterVersion;
  try {
    id = VerticalIdSchema.parse(verticalId);
    version = AdapterVersionSchema.parse(adapterVersion);
  } catch (error) {
    throw new ValidationError("Invalid vertical or adapter version.", String(error));
  }

  const knownVertical = ADAPTERS.some((adapter) => adapter.id === id);
  if (!knownVertical) {
    throw new UnsupportedVerticalError("Vertical is not supported.");
  }

  const adapter = BY_KEY.get(key(id, version));
  if (!adapter) {
    throw new UnsupportedAdapterVersionError("Adapter version is not supported for this vertical.");
  }

  return adapter;
}

/** Active version for *new* records only — never used as fallback when reading stored data. */
export function getActiveAdapterVersion(verticalId: string): AdapterVersion {
  const id = VerticalIdSchema.parse(verticalId);
  const match = ADAPTERS.find((adapter) => adapter.id === id);
  if (!match) {
    throw new UnsupportedVerticalError("Vertical is not supported.");
  }
  return match.version;
}
