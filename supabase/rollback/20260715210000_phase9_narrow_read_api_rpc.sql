-- Destructive rollback for disposable local/staging only.
-- Drops the narrow authenticated read API/RPC schema and all of its functions.
begin;

drop schema if exists institutionlens_api cascade;

commit;
