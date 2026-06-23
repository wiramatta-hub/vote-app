-- ============================================================
-- Seed: Initial admin user and vote config
-- Run AFTER schema.sql
-- ============================================================

-- Default vote config
INSERT INTO vote_config (vote_title, village_name, option_a_label, option_b_label, is_active)
VALUES (
  'การลงมติเลือกรูปแบบการบริหารหมู่บ้าน',
  'หมู่บ้านของเรา',
  'จัดตั้งนิติบุคคลหมู่บ้าน',
  'ให้เทศบาลรับภารกิจดูแล',
  true
) ON CONFLICT DO NOTHING;

-- Default admin user
-- username: admin
-- password: Admin@1234  (change immediately after first login!)
-- bcrypt hash for 'Admin@1234' with 12 rounds:
INSERT INTO admin_users (username, password_hash, role)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewxSNE4qGXCBM8/6',
  'admin'
) ON CONFLICT (username) DO NOTHING;
