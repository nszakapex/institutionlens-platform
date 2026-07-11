# InstitutionLens Foundation Plan

**Repository:** `institutionlens-platform`  
**Document status:** Approved foundation plan. Binding follow-ups live in `docs/DECISIONS.md`. Phase 0–1 scaffold proceeds under those decisions.  
**Brand source (read-only reference):** `assets/institutionlens/`  
**Clean-room posture:** No access to, import from, or derivation of Coverage / AD&Co materials

---

## 1. Executive product definition

InstitutionLens is a **configurable institutional-fit intelligence platform** for specialized B2B companies. Customers use it to:

1. Identify organizations that fit a defined portfolio of capabilities and commercial criteria.
2. Inspect the **evidence** behind each fit judgment.
3. Compare a small set of targets with provenance intact.
4. Produce **careful research briefs** suitable for internal review before any external use.

The platform is deliberately **not** a contact database, outbound automation system, opaque lead scorer, or universal industry graph. It is a **decision layer**: configurable logic + sourced evidence → ranked, explainable institution (organization) candidates.

**Architectural principle:** a **generic platform core** plus **independently versioned vertical adapters**. Each vertical owns its organization schema, evidence sources, capability catalog, rules, thresholds, terminology, compliance constraints, and output templates.

**First vertical adapter:** `financial_institutions`, populated exclusively with **newly designed deterministic synthetic data** that demonstrates the framework without reproducing Coverage or AD&Co models, datasets, catalogs, scores, or language.

---

## 2. Product boundaries and non-goals

### In scope (eventually)

- Multi-tenant authenticated application for fit exploration and briefing.
- Vertical adapters with isolated schemas, rules, and terminology.
- Explainable scoring with separate confidence, freshness, completeness, and publication eligibility.
- Evidence provenance and evidence-state labels.
- Bounded comparison (max three organizations).
- Research brief generation and library with publication-safety gates.
- Synthetic demo mode that is explicitly labeled and isolated.
- Safe, audited export workflows.

### Explicit non-goals (now and indefinitely unless re-approved)

- Contact enrichment, email/phone discovery, or sequencing.
- CRM replacement or bidirectional CRM sync (complementary integration may be considered later).
- Opaque single “AI score” without evidence linkage.
- Scraping or storing live regulatory corpora in MVP.
- Competitive/vendor-exhaust intelligence products.
- Client or relationship inference graphs.
- Marketing website hosting in this repository.
- Claims of SOC 2, HIPAA, encryption-at-rest, or compliance certification before verification.
- Telemetry, analytics SDKs, or third-party trackers by default.
- Import or reuse of Coverage / AD&Co data, rules, briefs, catalogs, or history.

### Clean-room exclusions (hard ban)

Do not transfer from Coverage:

- AD&Co data or terminology
- Stored regulatory datasets
- Competitive/vendor-exhaust intelligence
- Client or relationship inferences
- Briefs, digests, or generated outputs
- Product catalogs
- Scoring rules, weights, or thresholds
- Source files or Git history

---

## 3. Target customer types

Primary customers are **specialized B2B companies** whose go-to-market depends on **evidence-driven institutional or organizational fit**, including firms selling into:

| Vertical (adapter)                          | Example customer posture                                |
| ------------------------------------------- | ------------------------------------------------------- |
| Financial institutions                      | Vendors / advisors selling to banks and credit unions   |
| Legal services                              | Providers targeting law firms or legal departments      |
| Consulting and advisory                     | Firms selecting institutional or enterprise accounts    |
| Compliance and risk                         | Vendors aligning to regulated operating models          |
| Specialized B2B software                    | Niche software with constrained ICP definitions         |
| Other evidence-driven professional services | Adjacent categories with public + client-owned evidence |

**Common traits:** small-to-mid coverage or strategy teams; need for auditability; aversion to black-box scoring; portfolios of capabilities that must map to organizational need signals.

---

## 4. Primary user roles

| Role                             | Responsibility                                                                    | Authz posture             |
| -------------------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| **Tenant Owner**                 | Billing identity, retention policy acceptance, vertical enablement                | Full tenant admin         |
| **Admin**                        | Users, vertical config (within allowed knobs), export policy, demo mode           | Tenant-scoped admin       |
| **Analyst**                      | Explore, compare, inspect evidence, draft briefs                                  | Read + draft write        |
| **Reviewer**                     | Approve briefs for internal use / export eligibility                              | Review + publish gates    |
| **Viewer**                       | Read approved surfaces only                                                       | Read-only                 |
| **Platform Operator** (internal) | Adapter registry, synthetic fixtures, infra — not tenant data browsing by default | Break-glass only, audited |

Authorization is **fail-closed**: missing role or missing tenant context denies the operation.

---

## 5. Core workflows

1. **Onboard portfolio** — Admin selects vertical, loads capability catalog version, sets allowed rule pack version, confirms synthetic vs. future live data mode.
2. **Explore organizations** — Analyst filters/search within tenant + vertical bounds; sees fit, confidence, freshness, completeness, and publication eligibility as separate fields.
3. **Inspect organization** — Open detail: factors → contributions → evidence items with labels and provenance.
4. **Compare (≤3)** — Side-by-side factors and evidence deltas; hard cap enforced server-side.
5. **Draft research brief** — Generate from selected org(s) + methodology snapshot; mark draft; run publication-safety checks.
6. **Review & export** — Reviewer approves; export only if publication eligibility and safety checks pass; audit log written.
7. **Explain methodology** — Read versioned rules/methodology docs for the active adapter pack (no hidden weights in UI claims).
8. **Manage vertical config** — Adjust permitted configuration only (not arbitrary score hacking); changes versioned.
9. **Understand demo** — Synthetic demo explanation surface clarifies fictional data and non-transferability to production claims.

---

## 6. Marketing-site versus application boundary

| Concern      | Marketing site (separate repository) | This repository (`institutionlens-platform`)                                                                                          |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Brand, positioning, pilot CTA        | Authenticated product application                                                                                                     |
| Audience     | Public                               | Tenant-authenticated users                                                                                                            |
| Data         | None / form endpoint only            | Tenant, vertical, evidence, outputs                                                                                                   |
| Brand kit    | May ship its own copy                | Uses `assets/institutionlens/` as visual source; may copy tokens/fonts/SVGs into app design system — **not** marketing HTML structure |
| Architecture | Static reference HTML/CSS/JS         | Application architecture (see §7–§8)                                                                                                  |
| Claims       | Brand voice only                     | No fake customers, stats, or performance claims                                                                                       |

The files `assets/institutionlens/index.html`, `styles.css`, and `script.js` are **marketing-site references only**. Do not use their page composition, tab demos, or script patterns as the application architecture.

---

## 7. Technology comparison and recommendation

### Options compared

#### A. Next.js + TypeScript (App Router) with future PostgreSQL / Supabase

| Dimension                         | Assessment                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-tenant authorization        | Strong with server components/route handlers + DB RLS; session cookies via Auth provider; fail-closed middleware patterns are mature |
| Adapter extensibility             | TypeScript interfaces/modules versioned in-repo; Zod (or equivalent) for schema validation; adapters as packages under `adapters/`   |
| Explainable scoring               | Deterministic TypeScript rule engine for MVP; pure functions easy to unit test; JSON contribution trees serialize cleanly to UI      |
| Data ingestion                    | Heavier jobs later via workers/queues; MVP can use fixture loaders and bounded import jobs                                           |
| Application UI                    | Best fit — organization explorer, comparison, evidence trees, and brief editors are UI-dominant                                      |
| Background processing             | Needs explicit choice (e.g., queue worker, `pg` jobs, or later Inngest-class runner); not free with Next alone                       |
| Testing                           | Vitest/Jest + Playwright; deterministic fixtures without network                                                                     |
| Deployment                        | Vercel or container; Supabase/Postgres managed path scales with tenant isolation needs                                               |
| Maintainability for current owner | One primary language (TS) across UI and domain; aligns with brand-forward product work                                               |

#### B. Flask / Python

| Dimension                         | Assessment                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Multi-tenant authorization        | Achievable with Flask + SQLAlchemy + careful middleware; more custom glue for modern SPA auth            |
| Adapter extensibility             | Excellent for data/rules in Python modules; contracts must be duplicated for a separate frontend         |
| Explainable scoring               | Natural in Python; strong for future heavy analytics — **overkill for synthetic MVP**                    |
| Data ingestion                    | Best-in-class for ETL later; unnecessary complexity before live sources exist                            |
| Application UI                    | Weak alone — requires Jinja (limited for comparison UX) or a separate React/Next frontend (two runtimes) |
| Background processing             | Celery/RQ well understood                                                                                |
| Testing                           | Pytest ecosystem is excellent                                                                            |
| Deployment                        | Traditional WSGI/ASGI hosting; dual-stack if SPA added                                                   |
| Maintainability for current owner | Split stack increases surface area for a solo/small-owner product that is UI-heavy                       |

### Recommendation

**Adopt Next.js + TypeScript as the application foundation**, with **PostgreSQL** as the system of record and a **future Supabase path** (Auth + Postgres + RLS) once multi-tenant auth is required beyond local/dev stubs.

**Rationale:**

1. The product’s differentiating surfaces are **interactive and evidence-dense**; Next.js is the better primary vehicle.
2. Adapter contracts, Zod schemas, and explainable contribution trees benefit from **end-to-end types**.
3. Tenant isolation maps cleanly to **Postgres Row Level Security** (directly or via Supabase).
4. Synthetic MVP scoring should be **deterministic pure functions** — TypeScript is sufficient; Python can be introduced later as an optional worker language for heavy ingestion **without** becoming the app shell.
5. A Flask-first approach either underserves the UI or creates a dual-stack tax premature for this owner and phase.

**Explicitly deferred:** installing dependencies, scaffolding Next.js, provisioning Supabase/Postgres, or choosing a host. See §29.

### Baseline stack (planned, not installed)

| Layer           | Planned choice                                                                      |
| --------------- | ----------------------------------------------------------------------------------- |
| App framework   | Next.js (App Router) + TypeScript (strict)                                          |
| UI              | React Server Components + client islands where needed; CSS variables from brand kit |
| Validation      | Zod (or equivalent) at API and adapter boundaries                                   |
| DB              | PostgreSQL (local Docker or managed); Supabase Auth/RLS as optional future path     |
| Auth            | Session-based; fail-closed; provider TBD in approval list                           |
| Jobs            | In-process bounded jobs for MVP; queue later                                        |
| Tests           | Vitest (unit/contract) + Playwright (critical flows) + RLS/policy tests             |
| Package manager | pnpm (preferred) or npm — decide at scaffold approval                               |

---

## 8. Proposed repository structure

```text
institutionlens-platform/
  assets/institutionlens/          # Brand kit (read-only reference; do not modify kit files)
  docs/
    FOUNDATION_PLAN.md             # This document
    SECURITY.md                    # (future) threat model ops notes
    ADAPTERS.md                    # (future) adapter authoring guide
  apps/
    web/                           # Next.js application (future)
  packages/
    domain/                        # Generic domain types, scoring interfaces
    authz/                         # Fail-closed policy helpers
    evidence/                      # Evidence labels, provenance types
    ui/                            # Brand tokens, shared components
  adapters/
    financial_institutions/
      adapter.json                 # Manifest: id, version, vertical metadata
      schema/                      # Org + evidence schemas
      catalog/                     # Capability catalog (synthetic)
      rules/                       # Versioned rule packs
      fixtures/                    # Deterministic synthetic data
      templates/                   # Brief / methodology templates
      README.md                    # Synthetic-only disclaimer
  scripts/                         # Dev loaders, reset, lint helpers (future)
  tests/
    contract/                      # Adapter contract tests
    security/                      # Authz / isolation tests
    e2e/                           # Playwright
  .env.example                     # No secrets
  README.md
```

Notes:

- No marketing site app lives here.
- Adapters are first-class packages with **semver** and locked rule-pack versions per tenant config.
- Brand tokens are **copied/adapted** into `packages/ui` from the kit; the kit itself stays unmodified.

---

## 9. Generic platform domain model

Core entities (vertical-agnostic names):

| Entity                 | Purpose                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `Tenant`               | Isolation boundary; retention policy; enabled adapters                    |
| `User` / `Membership`  | Identity + role within tenant                                             |
| `VerticalAdapter`      | Registered adapter id + compatible versions                               |
| `TenantVerticalConfig` | Enabled adapter version, rule pack version, demo flags                    |
| `Capability`           | Item in a versioned catalog                                               |
| `Portfolio`            | Tenant’s selected capabilities / commercial framing                       |
| `Organization`         | Vertical-shaped record (schema from adapter)                              |
| `EvidenceItem`         | Atomic sourced claim with label + provenance                              |
| `EvidenceLink`         | Links evidence to org attributes or score contributions                   |
| `Factor`               | Named dimension used in fit explanation                                   |
| `ScoreContribution`    | Explainable delta tied to evidence and rule id                            |
| `FitAssessment`        | Fit score + separate confidence/freshness/completeness/publication fields |
| `ComparisonSet`        | ≤3 organization ids; server-validated                                     |
| `MethodologySnapshot`  | Frozen rule pack + catalog versions for audit                             |
| `ResearchBrief`        | Generated output with status + safety report                              |
| `ExportJob`            | Bounded export with audit trail                                           |
| `AuditEvent`           | Append-only security/product audit                                        |

**Invariant:** Fit score is **never** a conflation of confidence, freshness, completeness, or publication eligibility. Those are **separate fields** on `FitAssessment` (and shown separately in UI).

---

## 10. Tenant-isolation model

### Principles

1. **Fail-closed** — no tenant id in context ⇒ deny.
2. **Data-layer enforcement** — every table with tenant data includes `tenant_id`; RLS (or equivalent) requires `tenant_id = auth.tenant_id()`.
3. **Server-side authorization** — UI hiding is not security; every query/mutation re-checks role + tenant + vertical.
4. **Vertical isolation** — tenant may enable multiple verticals; queries always scoped by `(tenant_id, vertical_id)`.
5. **No cross-tenant joins** — comparisons, exports, and searches cannot accept foreign ids.
6. **Synthetic demo data** — either tenant-flagged demo tenant **or** `data_class = synthetic` rows that cannot be mixed into “live” publication without hard block.

### Enforcement layers

| Layer               | Mechanism                                          |
| ------------------- | -------------------------------------------------- |
| Edge / middleware   | Session required for `/app/**`                     |
| Application service | Policy checks (`can(action, resource)`)            |
| Database            | RLS + parameterized queries only                   |
| Exports             | Re-resolve all ids under tenant scope before write |

---

## 11. Vertical-adapter contract

Every adapter must expose a versioned manifest and implement:

```text
AdapterManifest
  id: string                     # e.g. financial_institutions
  displayName: string
  version: semver
  terminology: {...}             # org noun, fit noun, etc.
  organizationSchema: JSONSchema / Zod
  evidenceSourceTypes: string[]
  capabilityCatalogVersion: semver
  rulePackVersion: semver
  complianceConstraints: {...}
  outputTemplates: string[]
  publicationPolicy: {...}
  supportsSyntheticDemo: boolean
```

### Required adapter ports (interfaces)

| Port                                    | Responsibility                        |
| --------------------------------------- | ------------------------------------- |
| `validateOrganization(input)`           | Schema validation                     |
| `listCapabilities(version)`             | Catalog read                          |
| `evaluateFit(org, portfolio, rulePack)` | Returns FitAssessment + contributions |
| `explainContribution(id)`               | Evidence chain                        |
| `methodologyMarkdown(version)`          | Human-readable method                 |
| `renderBrief(input, templateVersion)`   | Brief AST/markdown                    |
| `publicationCheck(output)`              | Safety report                         |
| `searchFilterSchema`                    | Allowed filters only                  |

Adapters **must not** call the network inside deterministic evaluation. Ingestion is a separate, bounded pipeline.

---

## 12. Versioning strategy for adapters and rules

| Artifact           | Versioning                      | Compatibility rule                         |
| ------------------ | ------------------------------- | ------------------------------------------ |
| Adapter package    | semver (`MAJOR.MINOR.PATCH`)    | MAJOR = breaking schema/terminology        |
| Capability catalog | semver                          | Assessments store catalog version used     |
| Rule pack          | semver + immutable content hash | Re-score required on MAJOR; MINOR additive |
| Output templates   | semver                          | Briefs freeze template version             |
| Methodology docs   | tied to rule pack version       | Shown on Methodology page                  |

**Tenant pin:** `TenantVerticalConfig` pins `(adapterVersion, rulePackVersion, catalogVersion)`.  
**Upgrade:** explicit admin action; creates new `MethodologySnapshot`; optional re-score job (bounded).  
**Audit:** every assessment and brief stores the pins + content hashes.

---

## 13. Synthetic financial-institutions adapter

### Purpose

Demonstrate the platform with **deterministic fictional** institutions, evidence, capabilities, and rules. Educational and QA only.

### Requirements

- New names, IDs, metrics, and narratives — **not** Coverage/AD&Co reproductions.
- Stable seeds / fixtures so tests never flake.
- Explicit UI chrome: “Synthetic demo data — illustrative only.”
- No real routing/transit numbers, no real regulatory identifiers presented as live.
- Rules and weights invented for demo clarity; documented as illustrative.
- Evidence items use the required labels (§14).
- Publication eligibility for synthetic briefs defaults to **internal demo only** (not external-ready).

### Suggested synthetic shape (illustrative, to be designed in implementation — not real data)

- ~12–30 fictional organizations across asset-size bands and regions.
- Capability catalog of ~8–15 fictional offerings.
- Rule pack with 4–6 factors (e.g., need signal, portfolio match, timing, access — **names may be redesigned**; do not copy Coverage factor definitions or weights).
- Evidence mix covering all six labels.

### Non-reproduction checklist

- No AD&Co product names or client language.
- No stored Call Report / UBPR corpora.
- No vendor-exhaust or relationship graphs.
- No transplanted score thresholds from Coverage.

---

## 14. Evidence and provenance model

### Required evidence labels

Every `EvidenceItem` **must** carry exactly one primary label:

| Label          | Meaning                                                         |
| -------------- | --------------------------------------------------------------- |
| **Verified**   | Confirmed against an approved source record in-system           |
| **Calculated** | Derived by a documented formula from verified/calculated inputs |
| **Rule-based** | Produced by an explicit rule pack clause                        |
| **Inference**  | Probabilistic or heuristic; must not be presented as fact       |
| **Missing**    | Expected field absent; contributes to incompleteness            |
| **Stale**      | Previously known but past freshness SLA                         |

### Provenance fields (minimum)

- `source_type` / `source_id`
- `collected_at` / `as_of`
- `transform_chain` (ordered steps)
- `rule_id` (if rule-based)
- `label`
- `tenant_visibility` (public-source vs restricted-internal)
- `data_class` (`synthetic` | `public` | `restricted` | `customer_provided`)

### UI rules

- Inference and Missing/Stale must be visually distinct (Signal Blue sparingly for focus; never decorate Missing as success).
- Every score contribution links to ≥1 evidence item or an explicit Missing placeholder.

---

## 15. Fit scoring architecture

### Separation mandate

Do **not** create one universal opaque score. Persist and display:

1. **Fit score** — portfolio alignment under the pinned rule pack
2. **Evidence confidence** — strength/quality of supporting evidence
3. **Data freshness** — temporal validity vs SLA
4. **Data completeness** — coverage of required fields/factors
5. **Publication eligibility** — whether outputs may leave the system under policy

### Evaluation pipeline (deterministic)

```text
Portfolio + Organization
  → load pinned catalog + rule pack
  → gather evidence set (tenant/vertical scoped)
  → for each factor:
       compute contributions (each linked to evidence + rule clause)
  → aggregate Fit score (documented aggregation)
  → compute Confidence, Freshness, Completeness independently
  → compute Publication eligibility independently (policy engine)
  → emit FitAssessment + MethodologySnapshot refs
```

### Explainability invariant

Each `ScoreContribution` includes: `factor_id`, `rule_id`, `delta`, `rationale`, `evidence_ids[]`, `label_summary`.

No contribution without rationale and evidence linkage (or explicit Missing).

---

## 16. Confidence, freshness, and completeness model

| Dimension        | Inputs (conceptual)                                                            | Output                                                                          |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Confidence**   | Share of Verified/Calculated vs Inference; conflicting evidence; source grades | Separate score or ordinal band                                                  |
| **Freshness**    | `as_of` vs SLA per evidence type; Stale labels                                 | Separate score/band + “oldest material evidence”                                |
| **Completeness** | Required fields/factors present vs Missing                                     | Separate % or band                                                              |
| **Fit**          | Rule pack aggregation only                                                     | Must not silently discount via freshness/confidence — those are shown alongside |

UI pattern: fit as primary editorial number (Newsreader); confidence/freshness/completeness as Manrope metadata row with evidence labels — never merged into a single badge that hides tradeoffs.

---

## 17. Publication-safety model

Publication eligibility is a **hard gate**, not a cosmetic tag.

### Checks (minimum)

- Data class allows externalization (synthetic → demo/internal only by default).
- No restricted-internal evidence leaked into external templates.
- Inference labeled in output; cannot be reworded as verified.
- Missing/Stale material factors disclosed or block.
- Brief status ∈ {draft, in_review, approved_internal, approved_export}.
- Export requires `approved_export` + role Reviewer/Admin + tenant policy.
- Redaction pass for secrets/PII patterns before export bytes leave the server.

### Safe export workflow

1. User requests export of approved brief or bounded dataset.
2. Server re-authorizes + re-runs publication checks.
3. Job runs with size/time bounds.
4. Artifact stored tenant-scoped; download audited.
5. Failure fails closed (no partial unmarked file).

---

## 18. Page and component architecture

### Authenticated application surfaces

| Surface                        | Purpose                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| **Portfolio overview**         | Active vertical, portfolio summary, attention list, methodology pin |
| **Organization explorer**      | Search/filter table; separate metric columns                        |
| **Organization detail**        | Factors, contributions, evidence, provenance                        |
| **Comparison**                 | Max 3 orgs; server-enforced                                         |
| **Evidence & provenance**      | Cross-org evidence browser / deep links                             |
| **Methodology**                | Versioned human explanation of rules/catalog                        |
| **Research brief library**     | Drafts, reviews, approvals, safety reports                          |
| **Vertical configuration**     | Admin pins, demo flags, allowed knobs                               |
| **Synthetic demo explanation** | Explicit fiction + limitations                                      |
| **Safe export**                | Request, status, audit                                              |

### Component principles (application, not marketing)

- One primary decision per view.
- Hairline rules, open grids, square corners.
- Cards only for interactive records.
- Newsreader for org names, theses, large fit numerals.
- Manrope for controls, tables, evidence labels (uppercase tracked metadata).
- Signal Blue ≤ ~8% — focus, evidence-that-changes-fit, primary actions.
- No fake activity feeds or social proof modules.

### Route sketch (future)

```text
/app                              → portfolio overview
/app/orgs                         → explorer
/app/orgs/[orgId]                 → detail
/app/compare?ids=a,b,c            → comparison (≤3)
/app/evidence                     → evidence & provenance
/app/methodology                  → methodology
/app/briefs                       → brief library
/app/briefs/[briefId]             → brief detail
/app/admin/vertical               → vertical config
/app/demo                         → synthetic demo explanation
/app/exports                      → export workflow
```

Public marketing routes are **out of repo**. Unauthenticated users hitting `/app/**` are denied.

---

## 19. Brand-system integration

### Source of truth

Inspected kit at `assets/institutionlens/` — especially `BRAND-KIT.md` and token definitions. **Do not modify** brand kit files.

### Tokens to port into `packages/ui`

| Token         | Hex       | Role                                |
| ------------- | --------- | ----------------------------------- |
| Ledger Ivory  | `#F5F1E9` | App environmental surface           |
| Optic White   | `#FBFAF7` | Raised panels / document fields     |
| Lens Black    | `#111310` | Type and structure                  |
| Signal Blue   | `#0A52D6` | Evidence, focus, action             |
| Ledger Steel  | `#64655F` | Secondary copy / reference          |
| Private Night | `#111719` | High-security admin / risk sections |

Typography: **Newsreader** (editorial/display), **Manrope** (UI/body/data) from `assets/institutionlens/assets/fonts/`.  
Mark: `institutionlens-mark.svg` — no animation, glow, rotation, or outline.  
SVG language: graphite grid/nodes, blue signal nodes, traces, focus rings, crosshair — reuse patterns from financial-field / fit-signal as **visual vocabulary**, not as marketing section clones.

### Forbidden aesthetics in-app

- Generic SaaS purple gradients / glassmorphism stacks
- Pill-heavy chrome
- Fake customers, testimonials, performance claims
- Animated logo
- Motion that competes with reading (respect `prefers-reduced-motion`)

### Accessibility

- Accessible contrast on Ivory/White/Black/Steel/Blue combinations
- Visible focus rings (Signal Blue or Lens Black per surface)
- Reduced-motion equivalents for any diagnostic animation

---

## 20. Security threat model

### Assets

Tenant portfolios, configs, evidence (esp. restricted), assessments, briefs, exports, audit logs, credentials.

### Trust boundaries

Browser → Next server → Postgres; adapter code (in-process, trusted after review); future ingestion workers; export storage.

### Top threats & controls

| Threat                              | Control                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| Cross-tenant data read/write        | RLS + server policy; IDOR tests                                   |
| Vertical bleed                      | Composite scope `(tenant_id, vertical_id)`                        |
| Privilege escalation                | Role checks per mutation; fail-closed                             |
| Opaque/unsafe scoring claims        | Contribution + evidence invariants; tests                         |
| Prompt/template injection in briefs | Strict templates; sanitize; no raw HTML from model without policy |
| Export exfiltration                 | Publication gates; bounds; audit                                  |
| Secret leakage in logs              | Redaction middleware; no secrets in repo                          |
| Dependency compromise               | Lockfiles; minimal deps; CI audit                                 |
| SSRF via ingestion                  | No network in deterministic paths; allowlists later               |
| Demo data treated as real           | `data_class` + UI + publication policy                            |

### Logging

- Audit: who/what/when/tenant/vertical/result
- Application logs: redacted; no evidence payloads at info level by default

### Claims discipline

Do **not** claim encryption, compliance certifications, or infrastructure protections until verified and documented.

---

## 21. Data lifecycle, retention, and deletion

| Data class                | Retention default (proposal)                      | Deletion                                              |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Synthetic fixtures        | Rebuildable; not “customer data”                  | Reset via seed scripts                                |
| Customer portfolio/config | Until tenant deletion + grace                     | Hard delete after grace                               |
| Assessments               | Tied to tenant retention                          | Cascade delete                                        |
| Briefs / exports          | Tenant policy (proposed 30–365 days configurable) | Delete artifacts + DB rows; audit retained per policy |
| Audit logs                | Longer than content (proposed ≥1 year)            | Separate purge job                                    |
| Auth sessions             | Short-lived                                       | Logout / expiry                                       |

**Tenant offboarding:** documented delete job that removes tenant-scoped rows and objects; confirm with dry-run + report.  
**Backups:** when introduced, document backup retention and deletion lag honestly.

---

## 22. Testing and CI strategy

### Principles

- Synthetic-only fixtures
- **No external network** in deterministic unit/contract tests
- No telemetry in test/runtime defaults
- Security tests are first-class

### Test layers

| Layer       | Covers                                                  |
| ----------- | ------------------------------------------------------- |
| Unit        | Scoring pure functions; label rules; publication checks |
| Contract    | Adapter manifest + ports for `financial_institutions`   |
| Authz/RLS   | Cross-tenant denial; role denial; compare >3 denial     |
| Integration | API routes with test DB                                 |
| E2E         | Explorer → detail → compare → brief draft (synthetic)   |

### CI (planned)

- Typecheck, lint, unit/contract, authz tests on PR
- E2E on main or nightly
- Block merge if secrets detected
- No Coverage repo access in CI

---

## 23. Local-development strategy

1. Clone `institutionlens-platform` only.
2. Copy brand tokens/fonts into app packages when scaffolded (kit remains untouched).
3. `.env.example` with dummy values; never commit secrets.
4. Local Postgres via Docker Compose (when approved) **or** initial SQLite **only if** RLS story is not falsified — prefer Postgres early for isolation fidelity.
5. Seed synthetic adapter fixtures with one command.
6. Run app against demo tenant.
7. Tests run offline.

**Forbidden in local docs/scripts:** instructions to clone Coverage or copy its data.

---

## 24. MVP scope

### MVP includes

- App shell with brand tokens, auth gate (even if local stub users pending provider approval)
- Domain packages + adapter contract
- `financial_institutions` synthetic adapter (fixtures, rules, catalog, templates)
- Portfolio overview, explorer, detail, comparison (≤3), evidence/provenance, methodology, brief library (draft + internal approve), vertical config (pins), demo explanation, export stub with safety checks
- Separate display of fit / confidence / freshness / completeness / publication eligibility
- Evidence labels enforced
- Tenant isolation at application layer; DB RLS as soon as Postgres lands
- Automated tests for scoring explainability, compare cap, publication fail-closed, cross-tenant denial
- Docs: this plan + adapter README disclaimer

### MVP excludes

- Live regulatory ingestion
- Real organizations
- Additional verticals beyond stub registry entry
- Production Supabase project
- Billing
- CRM integrations
- AI free-form generation without templates
- Marketing pages
- Mobile native apps
- Third-party analytics

---

## 25. Phased implementation plan

### Phase 0 — Repository governance & docs hardening

**Objective:** Establish clean-room rules, doc index, and contribution boundaries without scaffolding an app.

**Files/components expected:**

- `docs/FOUNDATION_PLAN.md` (this file)
- `README.md` (repo purpose, clean-room notice, pointer to plan)
- Optional: `docs/CLEAN_ROOM.md` checklist excerpt

**Security considerations:** Explicit ban on Coverage imports; no secrets; no fake claims.

**Tests required:** None (docs only).

**Completion criteria:** Plan approved; README states application-only scope and clean-room policy.

**Rollback approach:** Revert doc commits.

---

### Phase 1 — Toolchain scaffold (approval-gated)

**Objective:** Create Next.js + TypeScript monorepo skeleton with lint/test harness; **no product features**.

**Files/components expected:**

- `apps/web` Next.js app
- `packages/domain`, `packages/ui` stubs
- `pnpm-workspace` / lockfile
- `.env.example`, `.gitignore`
- CI workflow stub

**Security considerations:** Dependency pin; secret scanning; default deny routes.

**Tests required:** “hello” unit test; typecheck clean.

**Completion criteria:** `dev` and `test` scripts run locally without network after install.

**Rollback approach:** Delete scaffold commit(s); remain docs-only.

---

### Phase 2 — Brand system package

**Objective:** Port tokens, fonts, mark into `packages/ui` without copying marketing layout.

**Files/components expected:**

- CSS variables, font loading, `LensMark` component
- Base typography/control styles; focus + reduced-motion
- Story/demo page optional under `/app/_brand` (dev only)

**Security considerations:** No remote font CDN required if self-hosted from kit copy.

**Tests required:** Token presence snapshot; mark renders; reduced-motion CSS present.

**Completion criteria:** App shell visually matches brand checklist; kit files unmodified.

**Rollback approach:** Revert `packages/ui` commit; keep scaffold.

---

### Phase 3 — Authz skeleton & tenant context

**Objective:** Fail-closed session + tenant membership model (stub provider acceptable until §29 decision).

**Files/components expected:**

- `packages/authz`
- Middleware protecting `/app/**`
- Membership roles enum
- Denial pages

**Security considerations:** No tenant ⇒ 401/403; no role ⇒ deny; log redaction.

**Tests required:** Unauthenticated access denied; wrong tenant denied.

**Completion criteria:** Protected routes unusable without context.

**Rollback approach:** Feature-flag middleware off only in emergency; prefer revert.

---

### Phase 4 — Data layer & isolation

**Objective:** Introduce PostgreSQL schema with `tenant_id` scoping (Supabase optional later).

**Files/components expected:**

- Migrations for tenant, membership, vertical config, audit
- RLS policies or documented equivalent enforcement
- Parameterized query layer

**Security considerations:** RLS enabled; tests for cross-tenant SELECT/INSERT failure.

**Tests required:** Isolation suite with two tenants.

**Completion criteria:** Cross-tenant reads fail at DB or repository layer with proof tests.

**Rollback approach:** Migration down scripts; restore snapshot.

---

### Phase 5 — Domain model & adapter contract

**Objective:** Implement generic types and adapter ports; register `financial_institutions` manifest only.

**Files/components expected:**

- `packages/domain`, `packages/evidence`
- `adapters/financial_institutions/adapter.json` + empty schemas
- Contract test harness

**Security considerations:** Schema validation on all inputs; no network in evaluate.

**Tests required:** Contract tests fail if ports missing.

**Completion criteria:** Adapter registry loads manifest; validation rejects bad payloads.

**Rollback approach:** Revert domain/adapter commits.

---

### Phase 6 — Synthetic FI adapter content

**Objective:** Deterministic synthetic orgs, evidence, catalog, rules, templates — clean-room designed.

**Files/components expected:**

- `fixtures/`, `rules/`, `catalog/`, `templates/`, adapter `README.md`
- Seed script

**Security considerations:** `data_class=synthetic`; publication defaults internal-only.

**Tests required:** Seed idempotence; golden scores for fixture set; offline evaluation.

**Completion criteria:** Seed produces stable IDs/scores; disclaimer present.

**Rollback approach:** Drop synthetic rows; revert fixtures.

---

### Phase 7 — Scoring engine & explainability

**Objective:** Deterministic evaluation emitting separate fit/confidence/freshness/completeness/publication + contributions.

**Files/components expected:**

- Scoring module in domain or adapter
- Contribution serializer
- Methodology snapshot writer

**Security considerations:** Invariants enforced in code; inference cannot masquerade as verified.

**Tests required:** Contribution↔evidence linkage; label coverage; separation of the five dimensions.

**Completion criteria:** Golden fixture assessments match snapshots; mutation of evidence changes contributions predictably.

**Rollback approach:** Pin previous rule pack; revert engine commit.

---

### Phase 8 — Core UI surfaces (read path)

**Objective:** Portfolio overview, explorer, detail, evidence, methodology, demo explanation.

**Files/components expected:**

- App routes listed in §18 (read-only first)
- Table, factor list, evidence label chips, metric split component

**Security considerations:** Server-side fetch scoped by tenant/vertical; no client-trusted filters.

**Tests required:** Playwright happy path on synthetic demo; empty/error states.

**Completion criteria:** Analyst can navigate overview → org → evidence with correct labels.

**Rollback approach:** Hide routes via flag; revert UI commits.

---

### Phase 9 — Comparison (≤3) & briefs

**Objective:** Comparison cap enforced; brief draft/review with publication-safety report.

**Files/components expected:**

- Compare route + API
- Brief library + detail
- Safety checker UI

**Security considerations:** >3 rejected server-side; export blocked without approval; restricted evidence excluded from external templates.

**Tests required:** Compare cap; brief status transitions; safety fail-closed.

**Completion criteria:** Three-org compare works; four rejected; brief cannot export when ineligible.

**Rollback approach:** Disable brief export; revert phase commits.

---

### Phase 10 — Vertical config, export workflow, hardening

**Objective:** Admin pins; bounded export jobs; CI security suite green; retention stubs documented.

**Files/components expected:**

- Admin vertical config UI
- Export job table + worker stub
- Retention/deletion design implemented as stubs or first purge dry-run
- Security test pack complete

**Security considerations:** Bounds on export size; audit events; redaction.

**Tests required:** Export authorization; audit written; tenant delete dry-run.

**Completion criteria:** MVP checklist (§24) satisfied; no network in unit tests; clean-room checklist signed in PR template.

**Rollback approach:** Disable exports; freeze config writes.

---

## 26. Suggested commit boundaries

1. Docs: foundation plan + README clean-room notice
2. Toolchain scaffold only
3. Brand token package (kit unmodified)
4. Authz middleware + roles
5. DB migrations + RLS tests
6. Domain + adapter contract
7. Synthetic FI fixtures/rules (content-only)
8. Scoring engine + golden tests
9. Read UI surfaces
10. Compare + briefs + safety
11. Admin config + export + CI hardening

Prefer small PRs aligned to phases 0–10. Never mix Coverage materials into any commit.

---

## 27. Risks and tradeoffs

| Risk / tradeoff                             | Notes                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Next.js without early Postgres RLS          | App-layer isolation alone is weaker — mitigate by Phase 4 soon after auth |
| Synthetic demo confused for product truth   | Requires persistent labeling + publication policy                         |
| Premature multi-vertical abstraction        | Contract first, only one real adapter in MVP                              |
| Dual-language (adding Python workers early) | Defer until ingestion needs justify it                                    |
| Supabase adoption timing                    | Auth convenience vs. vendor coupling — approve explicitly                 |
| Owner bandwidth                             | Phases gated; resist marketing-page rebuild inside this repo              |
| Clean-room drift                            | PR template checklist; refuse “just copy that rule” requests              |

---

## 28. Explicitly deferred features

- Live public-source connectors (filings, registries, etc.)
- Restricted internal evidence vault UX beyond model stubs
- Additional vertical adapters (legal, consulting, …) beyond registry placeholders
- Billing / self-serve signup
- CRM sync
- Free-form LLM briefs without template+safety harness
- Mobile apps
- Real-time collaboration
- Marketplace of community adapters
- Production observability vendors / telemetry SDKs
- Multi-region residency controls
- Formal compliance certifications

---

## 29. Decisions requiring owner approval

Before implementation beyond this document, approve or amend:

1. **Technology recommendation** — Proceed with Next.js + TypeScript + PostgreSQL (Supabase path later)?
2. **Auth provider** — Supabase Auth vs Auth.js vs other?
3. **Hosting** — Vercel vs container platform vs undecided?
4. **Monorepo tool** — pnpm + workspaces vs alternative?
5. **Phase 1 scaffold** — Permission to install dependencies and generate the app skeleton?
6. **Local DB** — Docker Postgres required from Phase 4, or temporary alternative?
7. **MVP auth fidelity** — Stub users in dev vs real provider immediately?
8. **Synthetic volume** — Target count of fictional orgs/capabilities for demo?
9. **Brief generation** — Template-only MVP vs allow assisted generation under safety harness?
10. **Retention defaults** — Accept proposed ranges in §21 or supply policy numbers?
11. **Export formats** — Markdown/PDF/JSON priority order?
12. **Naming** — Confirm “Organization” as generic noun vs vertical-specific terms only in UI terminology maps?
13. **Rule factor names** for synthetic FI — approve clean-room factor set before coding scores.
14. **Whether README + Phase 0 extras** may be added in the same change set as this plan or only after plan approval.

---

## 30. Clean-room compliance checklist

Use before every PR and especially before any adapter/scoring commit:

- [ ] No files sourced from Coverage or AD&Co repositories
- [ ] No AD&Co terminology introduced
- [ ] No regulatory datasets imported
- [ ] No competitive/vendor-exhaust intelligence
- [ ] No client/relationship inferences
- [ ] No briefs/digests/outputs reused
- [ ] No product catalogs copied
- [ ] No scoring rules/weights/thresholds transplanted
- [ ] No Git history rewritten from Coverage
- [ ] Synthetic data newly designed and labeled
- [ ] Brand kit not modified; marketing HTML not used as app architecture
- [ ] No secrets committed
- [ ] No customer performance claims or fake testimonials
- [ ] No unverified encryption/compliance claims
- [ ] Tests offline and synthetic-only

---

## Document control

| Field       | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Version     | 1.0                                                                       |
| Type        | Foundation plan                                                           |
| Code status | No application code in this change                                        |
| Next step   | Owner review of §7 recommendation, §24 MVP, §25 phases, and §29 approvals |
