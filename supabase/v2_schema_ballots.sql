-- ============================================================
-- Vote System V2 - Ballots table (multi-tenant voting)
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS v2_ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES v2_elections(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES v2_candidates(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_ballots_unique_voter UNIQUE (election_id, voter_key)
);

CREATE INDEX IF NOT EXISTS idx_v2_ballots_election ON v2_ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_v2_ballots_candidate ON v2_ballots(candidate_id);
CREATE INDEX IF NOT EXISTS idx_v2_ballots_account ON v2_ballots(account_id);
