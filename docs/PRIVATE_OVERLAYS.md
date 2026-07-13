# Private overlays

**Phase:** 4

## Purpose

An **organization overlay** is tenant-private relationship and capability-usage context for a synthetic organization. Overlays support opportunity-context derivation only.

**Overlays never alter capability fit points.**

## Schema highlights

- Relationship status: unknown, prospect, active_client, former_client, excluded
- Per-capability usage: unknown, not_used, evaluating, active, former
- Match / review status for overlay quality workflows
- Optional notes (max 240 chars) — **never** included in public view models
- Phase 4 synthetic overlays use `sourceClassification: synthetic_demo`

## Opportunity context

Derived inside portfolio aggregation from overlay + capability usage. Status values are internal signals (new relationship, additional capability, existing use, renewal, excluded, unknown). Safe UI surfaces human labels only — no machine reason codes.

## Access

- Repository: `OverlayRepository` / `SyntheticOverlayRepository`
- Permission: `assessment:read`
- Not every synthetic organization has an overlay (deliberate subset)
- Cross-tenant access fails closed without existence disclosure

## Hygiene

Overlay notes must not contain emails, phone numbers, or other PII patterns (`assertNoPiiPatterns`).
