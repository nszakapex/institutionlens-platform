# Runtime brand assets

This directory holds **application-owned copies** of InstitutionLens brand files required at runtime:

- `institutionlens-mark.svg` — optical mark for favicon / wordmark
- `fonts/*.woff2` — self-hosted Manrope and Newsreader

## Why this exists separately from `assets/institutionlens/`

| Path                      | Role                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `assets/institutionlens/` | **Source / reference kit.** Do not modify. Includes marketing HTML/CSS/JS references, brand documentation, and original assets. |
| `public/brand/`           | **Runtime copies** served by Next.js. Curated subset only (fonts + mark). Safe to refresh from the kit when brand files change. |

Do **not** edit the source kit to “fix the app.” Copy updated files into `public/brand/` instead. CSS tokens live in `src/styles/tokens.css` as the canonical application brand layer.

This folder must not contain secrets, absolute machine paths, databases, downloads, or marketing-site implementation files.
