-- ============================================================
-- Vote System - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: households
-- ============================================================
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_no TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: ballots
-- ============================================================
CREATE TABLE IF NOT EXISTS ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id),
  voter_name TEXT NOT NULL,
  is_proxy BOOLEAN NOT NULL DEFAULT false,
  proxy_name TEXT,
  choice TEXT NOT NULL CHECK (choice IN ('juristic', 'municipality', 'abstain', 'follow_majority')),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verified', 'rejected')),
  reject_reason TEXT,
  ip_address TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- Table: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('house_registration', 'proxy_letter', 'id_card_owner', 'id_card_proxy')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer'
    CHECK (role IN ('admin', 'reviewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: vote_config
-- ============================================================
CREATE TABLE IF NOT EXISTS vote_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_title TEXT NOT NULL DEFAULT 'การลงมติเลือกรูปแบบการบริหารหมู่บ้าน',
  village_name TEXT NOT NULL DEFAULT 'หมู่บ้าน',
  option_a_label TEXT NOT NULL DEFAULT 'จัดตั้งนิติบุคคลหมู่บ้าน',
  option_b_label TEXT NOT NULL DEFAULT 'ให้เทศบาลรับภารกิจดูแล',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ballots_household_id ON ballots(household_id);
CREATE INDEX IF NOT EXISTS idx_ballots_status ON ballots(status);
CREATE INDEX IF NOT EXISTS idx_documents_ballot_id ON documents(ballot_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- All access goes through service_role key from API routes
-- so we just enable RLS and deny public access
-- ============================================================
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Deny all public access (API uses service_role which bypasses RLS)
CREATE POLICY "deny_all_households" ON households FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_ballots" ON ballots FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_documents" ON documents FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_admin_users" ON admin_users FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_vote_config" ON vote_config FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_audit_logs" ON audit_logs FOR ALL TO anon USING (false);
