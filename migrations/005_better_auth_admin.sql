-- ============================================================
-- Migration 005: Better Auth admin plugin (gestión de usuarios + impersonación)
-- Campos añadidos por el plugin admin a user/session. Idempotente.
-- ============================================================
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS banned boolean;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banReason" text;
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "banExpires" timestamptz;
ALTER TABLE public.session ADD COLUMN IF NOT EXISTS "impersonatedBy" text;
