-- ============================================================
-- Vote System V2 - Multi-tenant starter schema
-- Run this manually in Neon/Supabase SQL editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS v2_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'village'
    CHECK (account_type IN ('village', 'school', 'organization')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES v2_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES v2_elections(id) ON DELETE CASCADE,
  candidate_no INTEGER NOT NULL,
  candidate_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT v2_candidates_unique_no UNIQUE (election_id, candidate_no)
);

CREATE INDEX IF NOT EXISTS idx_v2_elections_account_id ON v2_elections(account_id);
CREATE INDEX IF NOT EXISTS idx_v2_elections_is_active ON v2_elections(account_id, is_active);
CREATE INDEX IF NOT EXISTS idx_v2_candidates_election_id ON v2_candidates(election_id, display_order, candidate_no);

-- Optional starter data (safe for first run)
INSERT INTO v2_accounts (slug, name, account_type)
VALUES ('demo-school', 'โรงเรียนตัวอย่าง', 'school')
ON CONFLICT (slug) DO NOTHING;

WITH account_row AS (
  SELECT id FROM v2_accounts WHERE slug = 'demo-school' LIMIT 1
), election_row AS (
  INSERT INTO v2_elections (account_id, title, description, is_active, starts_at, ends_at)
  SELECT id,
         'เลือกตั้งประธานนักเรียน ปี 2569',
         'โหวตเลือกตั้ง 1 คนจากรายชื่อผู้สมัคร',
         true,
         now(),
         now() + interval '7 days'
  FROM account_row
  WHERE NOT EXISTS (
    SELECT 1 FROM v2_elections e
    WHERE e.account_id = account_row.id AND e.title = 'เลือกตั้งประธานนักเรียน ปี 2569'
  )
  RETURNING id
)
INSERT INTO v2_candidates (election_id, candidate_no, candidate_name, display_order)
SELECT e.id, c.candidate_no, c.candidate_name, c.display_order
FROM (
  VALUES
    (1, 'นางสาวกชกร ใจดี', 1),
    (2, 'นายธนกฤต พัฒนา', 2),
    (3, 'นางสาวพิชชาภา แสงทอง', 3)
) AS c(candidate_no, candidate_name, display_order)
JOIN (
  SELECT id FROM election_row
  UNION ALL
  SELECT e2.id
  FROM v2_elections e2
  JOIN v2_accounts a ON a.id = e2.account_id
  WHERE a.slug = 'demo-school' AND e2.title = 'เลือกตั้งประธานนักเรียน ปี 2569'
  LIMIT 1
) e ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_candidates x
  WHERE x.election_id = e.id AND x.candidate_no = c.candidate_no
);
