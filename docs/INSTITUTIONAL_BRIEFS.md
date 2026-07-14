# Institutional briefs

**Phase:** Project Phase 8  
**Routes:** `/briefs`, `/briefs/[briefRef]`  
**Binding decisions:** D-020, `docs/PHASE_8_PLAN.md`  
**Data status:** deterministic synthetic demo only

## Purpose and boundary

Generate **deterministic, evidence-backed institutional briefs** that summarize one synthetic organization for professional research and outreach preparation. Briefs explain permitted evidence, capabilities, assessment quality, gaps, and limitations.

Phase 8 briefs are **not** investment advice, rankings, purchase forecasts, or sales-certainty statements. They do **not** recalculate Phase 4 scores, invent free-form LLM narrative, mutate data, export PDF/Word, email, or publicly share documents.

## Canonical URLs

| URL                    | State                                   |
| ---------------------- | --------------------------------------- |
| `/briefs`              | Directory of authorized eligible orgs   |
| `/briefs?org=<oref_…>` | Directory with organization preselected |
| `/briefs/<bref_…>`     | Individual brief document               |

- Directory selection uses opaque `OrganizationPublicRef` (`oref_`)
- Document routes use opaque `BriefPublicRef` (`bref_` + 16–32 hex)
- `BriefPublicRef` is deterministic from `tenantId` + internal organization id (salt `il:brief-public-ref:v1`)
- Tenant id is included so the same organization id cannot correlate across tenants via a shared token
- Opaque refs are **not** an authorization boundary

Server builders: `briefDirectoryHref` / `briefDocumentHref` in `src/application/brief-query.ts`.  
Inbound research-surface actions: `inboundBriefActionFor` in `src/application/inbound-brief-action.ts`.

## Request flow

1. Route obtains the local-demo authorization context.
2. Service requires `brief:read`, `organization:read`, and `assessment:read` (reasserted before freeze).
3. Query/route parsers accept only opaque refs.
4. One tenant-scoped research read model is used; projections come from existing assessments.
5. Fixed templates in `brief-templates.ts` produce section language — no LLM.
6. Deep-frozen view models are leakage-checked and rendered by Server Components.

## Projection states

| State                               | Meaning                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `available`                         | Publication rules allow projecting assessment outputs where evidence permits |
| `insufficient_evidence`             | Gaps explained; missing evidence is never “capability absent”                |
| `not_published`                     | Numeric/external-ready assessment details withheld                           |
| `unauthorized`                      | Missing required read permissions                                            |
| `not_found` / `malformed` / `error` | Fail closed without leaking internals                                        |

## Classification labels

Observations carry explicit text labels (not color-only):

- Observed evidence
- Assessment output
- Gap
- Limitation
- Unavailable
- Not published

Evidence and provenance are visually separated from assessment interpretation. Supporting evidence links use descriptive titles and in-page anchors — never raw evidence IDs.

## Client / server boundary

| Module                    | Role                                                     |
| ------------------------- | -------------------------------------------------------- |
| `brief-query.ts`          | Server-only directory/document href builders             |
| `brief-service.ts`        | Server-only authz, project, freeze, leakage asserts      |
| `inbound-brief-action.ts` | Sole server-side source of inbound Brief actions         |
| `BriefsWorkspacePage`     | Server Component directory                               |
| `BriefDocumentPage`       | Server Component research document                       |
| `BriefSelectionForm`      | Narrow client island; redacted labels + opaque refs only |
| `brief-labels.ts`         | Client-safe classification/state label strings           |

## Inbound navigation

Authorized **Brief** / **Open brief** actions appear on:

- Overview shortlist
- Explorer result rows
- Organization detail actions
- Each Compare column

Each action:

- Is built only via `inboundBriefActionFor`
- Requires `brief:read` and `organization:read`
- Uses only a tenant-scoped opaque `bref_` href
- Uses accessible name `Open institutional brief for {organization}`
- Does **not** encode available / insufficient / not-published in action metadata

Attention and evidence-review queues intentionally omit Brief actions.

Browser Back restores exact prior URLs (Explorer filters/pagination/sort; Compare selection order). No localStorage, cookies, or brief cart.

## Print behavior

Print styles hide application chrome and interactive controls while retaining title, organization, as-of date, sections, evidence relationships, methodology, limitations, and disclaimer. Print is **not** a product export feature — no PDF/Word download, email, or public share pipeline.

## Accessibility and robots

- Exactly one `h1` per brief page
- Skip link is first keyboard target
- Semantic `main` / `article` / `section` hierarchy
- Routes declare `noindex`, `nofollow`, `noarchive`
- Responsive 320–1920 and genuine 200% page-scale evidence recorded in Batch 3

## Known limitations / deferred

- Synthetic local-demo authorization only
- No mutable draft/approve workflow (`brief:draft` / `brief:approve` unused)
- No PDF/Word export, email, or public sharing
- No database persistence, production auth, billing, notes, external data ingestion
- No AI narrative generation
- Vercel Preview classification for earlier branches is tooling/environment only — not a Phase 8 product defect
- Production deployment remains deferred
