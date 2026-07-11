# Clean-room policy

InstitutionLens Platform is a **clean-room** product relative to Coverage and any AD&Co-specific prototype.

## Forbidden

Do not access, clone, import, copy, or derive from Coverage:

- AD&Co data or terminology
- Stored regulatory datasets
- Competitive / vendor-exhaust intelligence
- Client or relationship inferences
- Briefs, digests, or generated outputs
- Product catalogs
- Scoring rules, weights, or thresholds
- Source files or Git history

## Required

- Design synthetic fixtures and rules independently in this repository.
- Use `Organization` as the generic platform term; adapters may supply user-facing labels (e.g. “Financial institution”).
- Keep generic domain code free of bank-, mortgage-, legal-, or AD&Co-specific terminology except inside a clearly scoped vertical adapter’s terminology map.
- Label synthetic demo data unmistakably fictional.
- Run `npm run scan:clean-room` before opening a PR that adds domain language or fixtures.

## Brand kit

- Treat `assets/institutionlens/` as design reference and source material.
- Do **not** modify the supplied kit files.
- Copy fonts/SVGs into app-owned paths (`public/brand/`) for runtime use.
- See `public/brand/README.md` for the runtime vs source separation.
- Do not treat marketing `index.html` / `styles.css` / `script.js` as application architecture.

## PR checklist

- [ ] No Coverage / AD&Co materials referenced or pasted
- [ ] No real organizations added
- [ ] Synthetic data newly designed and labeled
- [ ] No secrets committed
- [ ] Brand kit source unmodified
- [ ] No unverified compliance or isolation claims
