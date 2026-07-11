# Contributing

## Clean-room first

Read [`docs/CLEAN_ROOM_POLICY.md`](docs/CLEAN_ROOM_POLICY.md) before writing code or fixtures.

Do **not** access, clone, import, or copy from the Coverage repository or AD&Co-specific materials.

## Workflow

1. Keep changes scoped to the approved phase.
2. Prefer small, reviewable diffs.
3. Run `npm run verify` before requesting review.
4. Do not commit secrets, `.env.local`, or real organization data.
5. Do not modify `assets/institutionlens/` source kit files. Copy what the app needs into `public/brand/` or `src/`.
6. Do not add analytics, telemetry, or external runtime network calls without an approved decision.

## Commands

| Command                   | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `npm run dev`             | Local Next.js development server           |
| `npm run build`           | Production build (local verification only) |
| `npm run start`           | Serve production build locally             |
| `npm run lint`            | ESLint                                     |
| `npm run format`          | Prettier write                             |
| `npm run format:check`    | Prettier check                             |
| `npm run typecheck`       | TypeScript `--noEmit`                      |
| `npm test`                | Vitest unit tests                          |
| `npm run test:security`   | Header/CSP and security unit tests         |
| `npm run scan:secrets`    | Basic secret/path scan                     |
| `npm run scan:clean-room` | Terminology / clean-room scan              |
| `npm run scan:assets`     | Font and mark asset checks                 |
| `npm run verify`          | Full local verification suite              |

## Documentation

Approved decisions live in [`docs/DECISIONS.md`](docs/DECISIONS.md). Update that file when the owner records a new binding decision. Do not silently change architecture in code alone.

## Pull requests

Include:

- Phase / scope statement
- Clean-room checklist confirmation
- Test commands run and results
- Note if demo-auth or synthetic-only behavior changed

## Do not

- Configure Vercel, Supabase, or production hosts without approval
- Add a production-looking login while demo auth is active
- Introduce PostgreSQL/Prisma/Drizzle until that phase is approved
- Proceed past the approved phase boundary
