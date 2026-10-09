-- ============================================================================
-- Migration: 20261004210000_acl_least_privilege_hardening.sql
-- Description: Revoke TRUNCATE, MAINTAIN, TRIGGER, REFERENCES on public tables from anon and authenticated.
-- Fix default privileges for postgres role in schema public.
-- ============================================================================

REVOKE TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON TABLES FROM anon, authenticated;
