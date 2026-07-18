# Phase 11.1A — Visual-system addendum (public site + login)

**Status:** Implemented locally (code-only).
**Scope:** Shared InstitutionLens design tokens, the public marketing routes
(`/`, `/product`, `/how-it-works`, `/pricing`, `/request-access`), and `/login`.
**Out of scope:** The authenticated research workspace (`/app`, `/organizations`,
`/evidence`, `/compare`, `/briefs`, `/methodology`) keeps its existing visual and
functional behavior; it inherits only additive token changes.
**Authority:** `assets/institutionlens/BRAND-KIT.md` remains the brand source of
truth. This addendum records how Phase 11.1A applies it to the public surfaces.

## Typography

- **Families (unchanged, self-hosted only):** Newsreader 400/500 for display,
  headings, institutional statements, and large numerals; Manrope 400/500/600 for
  navigation, body, controls, labels, and metadata. No external font services.
  _Constraint note:_ the repo bundles static instances, not variable files; the
  refined-sans direction is carried by Manrope's three bundled weights.
- **Hierarchy (tokens in `src/styles/tokens.css`):**
  - `--il-fs-display-hero` — marketing hero display, `clamp(2.9rem → 5.4rem)`,
    Newsreader, line-height 0.98, tracking −0.045em. One per site (home hero).
  - `--il-fs-display-2` — page display for section pages, unchanged.
  - `--il-fs-editorial` — supporting editorial statements, unchanged.
  - Body/label/meta sizes unchanged so the workspace is unaffected.
- **Rules:** one H1 per route; uppercase reserved for evidence labels, eyebrows,
  and small navigation signals; numerals in Newsreader for display moments and
  `tabular-nums` Manrope for metadata rows.

## Color

- Palette is unchanged and fully token-driven: Ledger Ivory `#F5F1E9`,
  Optic White `#FBFAF7`, Lens Black `#111310`, Signal Blue `#0A52D6`,
  Ledger Steel `#64655F`, Private Night `#111719`.
- Signal Blue stays the single accent, held to roughly ≤8% of any composition:
  focus states, active nav, primary actions, and material nodes in SVG motifs.
- Each marketing page may use at most one Private Night inverse band; the login
  portal uses a quiet ivory field with an Optic White instrument panel.
- No color-only meaning anywhere; status semantics keep hue + shape/pattern.

## Spacing and layout

- Existing `--il-space-*` scale unchanged. Marketing compositions use the upper
  end (`--il-space-8/9`) between bands and hairline rules inside them.
- Bands are full-bleed with an inner `--il-content` column; one dominant anchor
  per viewport; cards only for bounded records or true panels, never floating
  chips. Corners stay square (`--il-radius-sm` max).

## Depth and surfaces

New additive tokens (`tokens.css`), used by marketing/login only:

- `--il-shadow-ambient` — soft, low-alpha ambient shadow for raised panels.
- `--il-shadow-lift` — slightly deeper shadow for the hero instrument panel.
- `--il-edge-light` / `--il-edge-light-inverse` — 1px inset top-light edge that
  makes Optic White panels read as physical plates on the ivory field.
- `--il-surface-sunken` — recessed ivory tone for inset wells and readout strips.
- `--il-grad-panel` / `--il-grad-band-night` — restrained tonal gradients for
  panel depth and the Private Night band.

Composition language: layered plates (env → panel → inset well), hairline
borders from the existing border tokens, and a faint grid texture supplied by
the `SignalField` SVG — never photographic texture, blobs, or glassmorphism.

## SVG language (code-native, in-repo)

New decorative motifs in `src/components/svg/` (all `aria-hidden` by default,
`currentColor` graphite + Signal Blue only, no fake data or fabricated charts):

- `EvidenceLens` — hero composition: graphite reference grid, one muted and one
  signal trace, focus rings + crosshair converging on a material node.
- `ProvenancePath` — source → transform → claim plates joined by a drawn path;
  the provenance concept from `docs/DATA_LINEAGE.md` as pure geometry.
- `SignalField` — quiet grid-and-node texture for band backgrounds.
- `RelationshipPaths` — sparse node web with one emphasized access path.

Existing motifs (`FinancialField`, `FitSignal`, `DataLineage`, etc.) remain for
the workspace. The `LensMark` is never animated (design-system contract).

## Motion

- Purposeful only: trace draw-in on hero/section motifs (`--il-dur-reveal`,
  `--il-ease-reveal`), a slow low-amplitude ambient drift on the hero panel
  (≥14s), and fast hover/focus transitions (`--il-dur-fast`).
- The global `prefers-reduced-motion` kill-switch in `components.css` disables
  all animation/transitions; drawn paths render complete.
- No scroll-jacking, no parallax, no animated numbers, no logo animation.

## Accessibility invariants (verified per route)

Skip link first; semantic `header/nav/main/footer` landmarks; exactly one H1;
visible focus (`--il-focus` ring); descriptive link text; keyboard-reachable
controls at ≥44px targets; no page-level horizontal overflow at 320–1920px and
at actual 200% zoom (320, 1024).

## Verification record (2026-07-18, local)

- `npm run verify` (format, lint, typecheck, full vitest 62 files / 407 tests,
  synthetic/methodology/assessment/read-model/prioritization/lineage/database
  validators, Phase 10 ETL check, asset/secret/clean-room scans, production
  `next build`) — passed. Demo env vars exported for the run, matching
  `.env.example` local-demo values (vitest does not read `.env.local`).
- Focused suites: `npm run test:phase11` 30/30; `npm run test:security` 193/193.
- Browser (production build, Playwright/Chromium against `localhost:3011`):
  `/`, `/product`, `/how-it-works`, `/pricing`, `/request-access`, `/login` at
  320/375/768/1024/1440/1920 — all HTTP 200, one H1, `#main` present, skip link
  first, no page-level horizontal overflow, no console errors, no failed
  requests. Actual 200% zoom at 320 and 1024 via CDP page-scale **and**
  halved-viewport reflow — no overflow. Indexing split confirmed: marketing
  routes send no `X-Robots-Tag` and meta `index, follow`; `/login` sends
  `noindex, nofollow, noarchive` in both header and meta.
- Workspace regression (dev server, local-demo): `/app`, `/organizations`,
  `/evidence`, `/compare`, `/briefs`, `/methodology` render unchanged — HTTP
  200, one H1, no overflow, no page errors. Under production `NODE_ENV` the
  synthetic workspace correctly fails closed (`demo_in_production`), as
  designed since Phase 9 — unrelated to this phase.
- Desktop (1440) and mobile (375) screenshots visually reviewed per route.

## Explicit non-changes

- No new fonts, images, external assets, analytics, or contact endpoints.
- `/login` stays noindex with unchanged auth, `returnTo` validation, and
  fail-closed behavior. Marketing stays indexable.
- Request-access remains invitation-only with no form and no fake submission.
- Workspace routes keep their existing composition and stylesheets.
