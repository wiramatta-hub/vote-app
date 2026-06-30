import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [households] = await sql`
    SELECT COUNT(*)::int AS count FROM households WHERE is_active = true
  `;

  const [config] = await sql`
    SELECT starts_at, ends_at, is_active FROM vote_config ORDER BY created_at ASC LIMIT 1
  `;
  const now = Date.now();
  const startsAt = config?.starts_at ? new Date(config.starts_at).getTime() : null;
  const endsAt = config?.ends_at ? new Date(config.ends_at).getTime() : null;
  const votingOpen = Boolean(
    config?.is_active &&
    (startsAt === null || now >= startsAt) &&
    (endsAt === null || now <= endsAt)
  );

  const statusRows = await sql`
    SELECT status, COUNT(*)::int AS count
    FROM ballots
    WHERE is_offline = false
    GROUP BY status
  `;
  const statusMap: Record<string, number> = {};
  for (const row of statusRows) statusMap[row.status] = row.count;

  const choiceRows = await sql`
    SELECT choice, status, COUNT(*)::int AS count
    FROM ballots
    WHERE status IN ('verified', 'submitted') AND is_offline = false
    GROUP BY choice, status
  `;
  const choiceMap: Record<string, number> = {};
  const pendingMap: Record<string, number> = {};
  for (const row of choiceRows) {
    if (row.status === 'verified') choiceMap[row.choice] = row.count;
    else if (row.status === 'submitted') pendingMap[row.choice] = row.count;
  }

  const offlineRows = await sql`
    SELECT choice, COUNT(*)::int AS count
    FROM ballots
    WHERE is_offline = true
    GROUP BY choice
  `;
  const offlineMap: Record<string, number> = {};
  for (const row of offlineRows) offlineMap[row.choice] = row.count;

  // Per-household derived status (active households only)
  const householdStatusRows = await sql`
    SELECT
      bool_or(b.is_offline) AS has_offline,
      bool_or(b.status = 'verified' AND b.is_offline = false) AS has_verified,
      bool_or(b.status = 'submitted' AND b.is_offline = false) AS has_submitted,
      COUNT(b.id)::int AS ballot_count
    FROM households h
    LEFT JOIN ballots b ON b.household_id = h.id
    WHERE h.is_active = true
    GROUP BY h.id
  `;
  const statusCounts = { none: 0, voted: 0, offline: 0, pending: 0 };
  for (const row of householdStatusRows) {
    if (row.has_offline) statusCounts.offline++;
    else if (row.has_verified) statusCounts.voted++;
    else if (row.has_submitted) statusCounts.pending++;
    else statusCounts.none++;
  }

  const submitted = statusMap['submitted'] ?? 0;
  const verified = statusMap['verified'] ?? 0;
  const rejected = statusMap['rejected'] ?? 0;
  const offline =
    (offlineMap['juristic'] ?? 0) +
    (offlineMap['municipality'] ?? 0) +
    (offlineMap['abstain'] ?? 0) +
    (offlineMap['follow_majority'] ?? 0);
  const total = submitted + verified + rejected + offline;

  return NextResponse.json({
    totalHouseholds: households.count,
    total,
    totalBallots: total,
    submitted,
    verified,
    rejected,
    juristic: choiceMap['juristic'] ?? 0,
    municipality: choiceMap['municipality'] ?? 0,
    abstain: choiceMap['abstain'] ?? 0,
    follow_majority: choiceMap['follow_majority'] ?? 0,
    juristic_pending: pendingMap['juristic'] ?? 0,
    municipality_pending: pendingMap['municipality'] ?? 0,
    abstain_pending: pendingMap['abstain'] ?? 0,
    follow_majority_pending: pendingMap['follow_majority'] ?? 0,
    offline,
    juristic_offline: offlineMap['juristic'] ?? 0,
    municipality_offline: offlineMap['municipality'] ?? 0,
    abstain_offline: offlineMap['abstain'] ?? 0,
    follow_majority_offline: offlineMap['follow_majority'] ?? 0,
    statusCounts,
    votingOpen,
  });
}
