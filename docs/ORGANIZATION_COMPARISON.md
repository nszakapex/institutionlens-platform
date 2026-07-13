# Organization comparison

**Phase:** Project Phase 7  
**Route:** `/compare`  
**Binding decisions:** D-019, `docs/PHASE_7_PLAN.md`  
**Data status:** deterministic synthetic demo only

## Purpose and boundary

Compare **two or three** synthetic organizations side by side using existing Phase 4 assessment outputs and Phase 6 redacted projections. Comparison is a research contrast surface, not a ranking, recommendation, or investment conclusion.

Phase 7 does **not** include briefs, exports, notes, mutations, persistent saved comparisons, database persistence, production authentication, AI narratives, Phase 4 methodology changes, or Vercel/deployment work.

## Canonical URL

| URL                                         | State                       |
| ------------------------------------------- | --------------------------- |
| `/compare`                                  | Empty selection             |
| `/compare?org=<oref>`                       | Partial (add another)       |
| `/compare?org=<oref>&org=<oref>`            | Ready (two organizations)   |
| `/compare?org=<oref>&org=<oref>&org=<oref>` | Ready (three organizations) |

- Repeated `org` parameters are the source of truth
- Values must be opaque `OrganizationPublicRef` (`oref_` + 16–32 hex)
- Order is first-seen selection order after dedupe — **not** a score ranking
- Duplicates keep the first occurrence
- More than three distinct refs fail closed (`malformed`)

Server builder: `compareHrefFor` in `src/application/compare-query.ts`.  
Client format helper (opaque-format only): `src/lib/compare-url.ts`.

## Request flow

1. Route reads search params and obtains the local-demo authorization context.
2. Service requires `organization:read` and `assessment:read`.
3. Query parser validates opaque refs and cardinality.
4. One tenant-scoped research read model is built for the request.
5. Refs resolve inside that model; unknown refs yield `not_found`.
6. Columns and differences are projected from existing assessments — no recalculation.
7. Deep-frozen `ComparePageView` is rendered by a Server Component.

## Client / server boundary

| Module                     | Role                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `compare-query.ts`         | Server-only canonical parse/serialize and href builders    |
| `compare-service.ts`       | Server-only authz, resolve, project                        |
| `ComparePage.tsx`          | Server Component; consumes precomputed view + `removeHref` |
| `CompareSelectionForm.tsx` | Narrow client island; redacted labels + opaque refs only   |
| `compare-url.ts`           | Client-safe format checks; not authorization               |

Inbound Compare links from Overview shortlist, Explorer rows, and organization detail are server-built with `compareHrefFor([publicRef])`. Visible label is concise (“Compare”); accessible name is `Add {organization} to comparison`.

Attention and evidence-review queues intentionally omit Compare actions in Phase 7.

## Authorization and redaction

- Missing `organization:read` or `assessment:read` → `unauthorized`
- Overlay details require `overlay:read`; without it, overlay is `{ access: "restricted" }` only (no existence leakage beyond access denial)
- Restricted evidence remains gated by `evidence:restricted_read`; counts/titles exclude restricted items for unauthorized roles
- No private overlay notes in any projection
- No raw organization, evidence, provenance, capability, tenant, or principal IDs in URLs, HTML, RSC payloads, or client state

## Difference semantics

Fixed labels only:

| State            | Meaning                                                         |
| ---------------- | --------------------------------------------------------------- |
| `same`           | Every compared organization publishes the same value            |
| `different`      | Compared organizations publish different values                 |
| `unavailable`    | At least one organization has no publishable value              |
| `not_comparable` | Values cannot be compared under publication or assessment rules |

Missing evidence is **not** treated as a missing capability or negative fit.

## Accessibility

- One page `h1`
- Skip link remains first keyboard target
- Selection uses fieldset/legend; live status for selection changes
- Remove actions include organization context
- Difference markers use text symbols in addition to color
- Responsive stacking repeats dimension labels per organization on narrow viewports
- 200% browser page scale verified at 320 and 1024 baselines

## Known limitations

- Synthetic local-demo authorization only
- No saved comparisons or share carts beyond the URL
- No-JavaScript GET checkbox order follows alphabetical candidate DOM order; that order has no ranking meaning
- Vercel Preview classification for earlier phase branches is an environment/tooling limitation, not a Phase 7 product defect
- Production auth, RLS, and real-data ingestion remain deferred
