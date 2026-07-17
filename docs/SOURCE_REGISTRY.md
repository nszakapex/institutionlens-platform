# Source registry

**Phase:** 10  
**Canonical offline file:** `python/institutionlens_etl/fixtures/registry.json`  
**TypeScript mirror schema:** `src/ingestion/source-registry.ts`  
**Policy:** `docs/PUBLIC_SOURCE_POLICY.md`

## Purpose

A versioned allowlist of institutional sources the ETL may process. Unknown source ids are rejected. Phase 10 ships **offline fixture** entries only; live classes may appear as non-executable stubs for planning.

## Schema (JSON)

| Field                                   | Type                  | Rules                                                                         |
| --------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `registryVersion`                       | semver string         | Required                                                                      |
| `policyVersion`                         | semver string         | Must match public-source policy revision used by CLI                          |
| `sources[]`                             | array                 | Bounded (≤ 200)                                                               |
| `sources[].id`                          | `src_[a-z0-9_]{1,48}` | Stable id                                                                     |
| `sources[].class`                       | enum                  | `offline_fixture` \| `public_registry` \| `public_notice` \| `public_website` |
| `sources[].displayName`                 | string ≤ 160          | Human label                                                                   |
| `sources[].jurisdiction`                | string ≤ 64           | e.g. `XX_DEMO`                                                                |
| `sources[].licenseStatus`               | enum                  | `synthetic_demo` \| `unknown` \| `permitted_internal`                         |
| `sources[].defaultAccessClassification` | enum                  | `synthetic` \| `internal` \| `restricted`                                     |
| `sources[].liveFetch`                   | boolean               | Must be `false` for Phase 10 executable sources                               |
| `sources[].fixtureUri`                  | string                | Required when `class=offline_fixture` — `fixture://…` only                    |
| `sources[].notes`                       | string ≤ 400          | Optional operator notes (not private_notes)                                   |

## Phase 10 executable entries

See `registry.json` for the authoritative list. All executable entries:

- `class = offline_fixture`
- `liveFetch = false`
- `fixtureUri` under `fixture://phase10/…`
- license `synthetic_demo`

## Non-executable stubs

Optional stub rows may document future live classes with `liveFetch: false` and no fixture URI. The CLI must not process them until a later phase sets an explicit connector contract **and** owner approval.

## Change control

1. Update `registry.json` and bump `registryVersion`.
2. Align `policyVersion` when legal-use rules change.
3. Re-run Python + TypeScript registry contract tests.
4. Never commit credentials or live endpoint secrets into the registry.
