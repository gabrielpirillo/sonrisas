-- ============================================================
-- Smile Forward — Migration 002: Multi-tenancy + Credit Billing
-- ============================================================
-- Introduces:
--   * clinics            → tenant table (one paying customer each)
--   * clinic_id columns  → on users / leads / generations
--   * credit_costs        → configurable credit price per action
--   * credit_ledger       → append-only history of every credit movement
--   * clinics.credit_balance → fast, atomic source of truth for gating
--
-- Billing model: PREPAID CREDITS. The local ledger is authoritative for
-- gating (atomic, never oversells). Flexprice is the metering / invoicing
-- system of record (events ingested best-effort). Stripe Checkout tops up.
--
-- Safe to run multiple times (idempotent: IF NOT EXISTS / guarded backfill).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Clinics (tenants)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    -- Public key embedded in the widget to attribute usage to a clinic.
    public_widget_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    -- Authoritative prepaid balance (in credits). Never goes below 0.
    credit_balance INTEGER NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
    -- External billing identifiers.
    stripe_customer_id TEXT,
    flexprice_customer_id TEXT,
    flexprice_wallet_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()))
);

CREATE INDEX IF NOT EXISTS idx_clinics_widget_key ON public.clinics(public_widget_key);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON public.clinics(slug);

-- Keep updated_at fresh (reuses helper from migration 001).
DROP TRIGGER IF EXISTS trigger_clinics_updated_at ON public.clinics;
CREATE TRIGGER trigger_clinics_updated_at
    BEFORE UPDATE ON public.clinics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Tenant columns on existing tables
-- ============================================================
ALTER TABLE public.users       ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.leads       ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_clinic_id       ON public.users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_clinic_id       ON public.leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_generations_clinic_id ON public.generations(clinic_id);

-- ============================================================
-- Credit costs (configurable price per billable action)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credit_costs (
    action TEXT PRIMARY KEY,
    credits INTEGER NOT NULL CHECK (credits >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()))
);

INSERT INTO public.credit_costs (action, credits) VALUES
    ('image', 1),
    ('video', 4)
ON CONFLICT (action) DO NOTHING;

-- ============================================================
-- Credit ledger (append-only audit of every movement)
-- ============================================================
-- kind:
--   reserve → credits held when a generation starts (negative delta)
--   refund  → credits returned when a generation fails (positive delta)
--   topup   → credits purchased via Stripe (positive delta)
--   adjust  → manual admin adjustment (signed)
-- idempotency_key guarantees a reserve/refund/topup is applied at most once.
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now())),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    action TEXT,                       -- 'image' | 'video' | 'topup' | ...
    kind TEXT NOT NULL CHECK (kind IN ('reserve', 'refund', 'topup', 'adjust')),
    credits_delta INTEGER NOT NULL,    -- signed (negative = debit)
    balance_after INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    generation_id UUID,
    stripe_session_id TEXT,
    flexprice_event_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_clinic ON public.credit_ledger(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_generation ON public.credit_ledger(generation_id);

-- ============================================================
-- Default clinic + backfill existing rows
-- ============================================================
-- Creates a single default clinic so existing single-tenant data keeps
-- working. New clinics are created via the admin/onboarding flow.
DO $$
DECLARE
    v_clinic_id UUID;
BEGIN
    SELECT id INTO v_clinic_id FROM public.clinics WHERE slug = 'default';

    IF v_clinic_id IS NULL THEN
        INSERT INTO public.clinics (name, slug, credit_balance)
        VALUES ('Default Clinic', 'default', 0)
        RETURNING id INTO v_clinic_id;
    END IF;

    UPDATE public.users       SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
    UPDATE public.leads       SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
    UPDATE public.generations SET clinic_id = v_clinic_id WHERE clinic_id IS NULL;
END $$;

-- ============================================================
-- Atomic credit helpers
-- ============================================================
-- Debit (reserve): deducts credits ONLY if balance is sufficient.
-- Returns the new balance, or NULL when there are not enough credits.
-- The single UPDATE ... WHERE credit_balance >= amount is race-safe and
-- prevents overselling under concurrent generations.
CREATE OR REPLACE FUNCTION public.debit_credits(p_clinic_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.clinics
    SET credit_balance = credit_balance - p_amount
    WHERE id = p_clinic_id AND credit_balance >= p_amount
    RETURNING credit_balance INTO v_new_balance;

    RETURN v_new_balance; -- NULL if insufficient / clinic missing
END;
$$;

-- Credit (refund / topup): always succeeds, returns the new balance.
CREATE OR REPLACE FUNCTION public.credit_credits(p_clinic_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.clinics
    SET credit_balance = credit_balance + p_amount
    WHERE id = p_clinic_id
    RETURNING credit_balance INTO v_new_balance;

    RETURN v_new_balance;
END;
$$;
