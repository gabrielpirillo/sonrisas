-- ============================================================
-- Smile Forward — Migration 003: Better Auth + organization (multi-tenant auth)
-- ============================================================
-- Tablas de Better Auth (core + plugin organization). Nombres de columna en
-- camelCase entre comillas: deben coincidir EXACTAMENTE con lo que Better Auth
-- consulta (generado con su CLI). Enlaza `clinics` ↔ `organization` (1:1) vía
-- `clinics.org_id`, preservando el sistema de créditos existente.
-- Idempotente (IF NOT EXISTS).
-- ============================================================

-- ── Core: user / session / account / verification ───────────────────────────
CREATE TABLE IF NOT EXISTS public."user" (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    "emailVerified" boolean NOT NULL DEFAULT false,
    image text,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.session (
    id text PRIMARY KEY,
    "expiresAt" timestamptz NOT NULL,
    token text NOT NULL UNIQUE,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    "activeOrganizationId" text
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON public.session ("userId");

CREATE TABLE IF NOT EXISTS public.account (
    id text PRIMARY KEY,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamptz,
    "refreshTokenExpiresAt" timestamptz,
    scope text,
    password text,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON public.account ("userId");

CREATE TABLE IF NOT EXISTS public.verification (
    id text PRIMARY KEY,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamptz NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON public.verification (identifier);

-- ── Plugin organization: organization / member / invitation ─────────────────
CREATE TABLE IF NOT EXISTS public.organization (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    logo text,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata text
);

CREATE TABLE IF NOT EXISTS public.member (
    id text PRIMARY KEY,
    "organizationId" text NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    "userId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "member_organizationId_idx" ON public.member ("organizationId");
CREATE INDEX IF NOT EXISTS "member_userId_idx" ON public.member ("userId");

CREATE TABLE IF NOT EXISTS public.invitation (
    id text PRIMARY KEY,
    "organizationId" text NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text,
    status text NOT NULL DEFAULT 'pending',
    "expiresAt" timestamptz NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "invitation_organizationId_idx" ON public.invitation ("organizationId");
CREATE INDEX IF NOT EXISTS invitation_email_idx ON public.invitation (email);

-- ── Enlace clinics ↔ organization (1:1) ─────────────────────────────────────
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS org_id text REFERENCES public.organization(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_org_id ON public.clinics(org_id) WHERE org_id IS NOT NULL;
