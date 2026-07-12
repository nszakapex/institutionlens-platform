# Phase 2 — Design system and application shell

**Status:** In implementation  
**Scope:** Visual and structural only. No domain models, scoring, explorer, briefs, database, or real auth.

## Intent

| Question   | Answer                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Who        | Strategy, growth, and relationship leaders evaluating institutional fit with evidence they must defend |
| Accomplish | Orient inside the product; learn the visual language that will carry explainable fit judgments         |
| Feel       | Private analytical instrument — calm, exact, editorial — not a SaaS dashboard                          |

**Signature:** Hairline instrument on Ledger Ivory. Newsreader for decisions and numerals; Manrope for controls and evidence metadata; Signal Blue reserved for focus, selection, and material evidence.

## Deliverables

1. Expanded CSS token architecture (`src/styles/tokens.css`)
2. Code-native SVG visual language (`src/components/svg/`)
3. Foundational controls, epistemic labels, product-status primitives
4. `AppShell` with header, nav, mobile nav, footer, synthetic notice
5. Synthetic design-system preview at `/`
6. Placeholder routes for future nav destinations
7. Accessibility + unit tests; visual QA at target widths

## Non-goals

Phase 3+ domain work, real data, database, Supabase, production auth, prior-product materials, brand kit source edits, lockfile regeneration under Node 24.

## Navigation (placeholders)

Overview · Organizations · Compare · Evidence · Briefs · Methodology · Settings

Disabled or labeled “Later phase” until product surfaces exist.
