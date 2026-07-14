-- DESTRUCTIVE: approved local/staging rollback only. Never run after customer data is accepted.
begin;
drop schema if exists institutionlens cascade;
commit;
