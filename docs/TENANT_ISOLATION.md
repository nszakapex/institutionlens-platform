# Tenant isolation

## Current model (Phase 3)

1. App routes and health still gate on `getDemoPrincipal()` (env-backed local-demo principal).
2. Domain reads use `AuthorizationContext` from `getDemoAuthorizationContext()`.
3. Domain tenant ID is `tenant_demo_research` — **not** taken from URL, cookies, or client state.
4. Env `IL_DEMO_TENANT_ID` validates the demo gate but is not copied into organization records.
5. Every repository method requires `AuthorizationContext` and scopes results to `context.tenant.id`.
6. Cross-tenant lookups return the same not-found result without revealing existence.

## Authorization actions

Read actions enforced now:

- `organization:read`
- `evidence:read`
- `methodology:read`

Mutation actions are defined for future phases but unused.

Demo analyst receives only the minimum read set needed for the foundation preview.

## Fail closed

Suspended tenant, suspended principal, missing permission, missing context, and tenant/principal mismatch all fail with safe public errors.

## Future mapping

When PostgreSQL lands, tenant_id columns and RLS policies must enforce the same boundary. Application checks remain defense in depth — not a substitute for RLS.
