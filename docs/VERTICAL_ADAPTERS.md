# Vertical adapters

## Contract

Each adapter declares:

- `id` + `version` (semver)
- organization noun / vocabulary
- Zod payload schema
- supported evidence types
- publication policy hooks
- validated vertical filters
- synthetic fixture loader

## Registry

`src/verticals/registry.ts` is an **explicit allowlist**. No filesystem discovery and no dynamic imports.

Lookup requires both vertical ID and adapter version. Unknown IDs or versions fail explicitly. There is **no** fallback to latest when reading stored records.

New records may use the configured active version for a vertical. Existing records retain the version used at validation time.

## Financial institutions (`1.0.0`)

Located under `src/verticals/financial-institutions/`.

- Independently designed synthetic payload (categorical bands, fictional regions)
- No real regulatory identifiers, websites, dollar figures, or institution names
- Fixture version `1.0.0` separate from adapter and domain schema versions

## Version fields (do not overload)

1. Domain schema version
2. Adapter version
3. Fixture / dataset version
4. Future rule-set version (deferred)
