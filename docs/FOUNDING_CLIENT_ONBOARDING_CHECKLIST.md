# Founding-client onboarding checklist

**Audience:** InstitutionLens operators (human-operated)  
**Phase:** 11 docs only — this checklist does **not** create users, tenants, memberships, payments, or customer data.

Use this when inviting an approved founding client after commercial agreement outside the application.

## Before invite

1. Confirm invitation approval and the $200 setup + $99/month commercial terms offline.
2. Confirm target environment (`staging` or `production`) and that live Supabase Auth + memberships are ready.
3. Confirm workspace tenant exists (or will be created through approved operational tooling — not through this app).
4. Confirm no customer data will be loaded until legal/privacy review is complete.
5. Confirm `IL_FOUNDING_CONTACT_URL` (if used) points to the correct operator-controlled channel.

## Provision (outside this repository UI)

1. Create Auth user via approved Admin/operational path.
2. Create or attach `memberships` row with the correct role (`analyst` typical for founding research use).
3. Verify `session_tenant_public_ref` returns exactly one tenant for that user.
4. Send credentials / magic-link through a secure out-of-band channel (not logged in app diagnostics).
5. Do **not** paste secrets into tickets, commits, or chat logs.

## Client validation

1. Client opens the public site and uses **Sign in** (not a self-serve signup).
2. Client reaches `/app` overview after authentication.
3. Client can open Organizations, Evidence, Compare, Briefs, Methodology as permitted by role.
4. Client cannot access other tenants’ data (spot-check with a second membership if available).
5. Confirm public marketing pages remain available signed-out; research pages remain noindex.

## Access pending / revocation

- If membership is missing or inactive, the app must fail closed with a generic invitation/access message — never confirm whether a specific workspace or email exists.
- To revoke: disable Auth user and/or membership through operational tooling; confirm signed-in sessions can no longer load `/app`.

## Explicitly out of scope here

- Card payments, invoices, dunning
- Automated email onboarding sequences
- Self-service signup
- Production deploy from this checklist alone
