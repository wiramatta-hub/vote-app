import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { REPRESENTATIVES } from '@/lib/representatives';

export async function GET() {
  const [households] = await sql`
    SELECT COUNT(*)::int AS count FROM households WHERE is_active = true
  `;

  const statusRows = await sql`
    SELECT status, COUNT(*)::int AS count
    FROM ballots
    WHERE is_offline = false
    GROUP BY status
  `;
  const statusMap: Record<string, number> = {};
  for (const row of statusRows) statusMap[row.status] = row.count;

  const choiceRows = await sql`
    SELECT choice, COUNT(*)::int AS count
    FROM ballots
    WHERE status = 'verified' AND is_offline = false
    GROUP BY choice
  `;
  const choiceMap: Record<string, number> = {};
  for (const row of choiceRows) choiceMap[row.choice] = row.count;

  const offlineRows = await sql`
    SELECT choice, COUNT(*)::int AS count
    FROM ballots
    WHERE is_offline = true
    GROUP BY choice
  `;
  const offlineMap: Record<string, number> = {};
  for (const row of offlineRows) offlineMap[row.choice] = row.count;

  const representativeRows = await sql`
    SELECT
      rv->>'representative' AS representative,
      rv->>'decision' AS decision,
      b.status,
      COUNT(*)::int AS count
    FROM ballots b
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(b.representative_votes, '[]'::jsonb)) AS rv
    WHERE b.is_offline = false
      AND b.status IN ('verified', 'submitted')
    GROUP BY rv->>'representative', rv->>'decision', b.status
  `;
  const representativeMap = new Map<string, { approved: number; rejected: number; pendingApproved: number; pendingRejected: number }>();
  for (const name of REPRESENTATIVES) {
    representativeMap.set(name, { approved: 0, rejected: 0, pendingApproved: 0, pendingRejected: 0 });
  }
  for (const row of representativeRows) {
    const current = representativeMap.get(row.representative);
    if (!current) continue;
    if (row.status === 'verified' && row.decision === 'approve') current.approved = row.count;
    if (row.status === 'verified' && row.decision === 'reject') current.rejected = row.count;
    if (row.status === 'submitted' && row.decision === 'approve') current.pendingApproved = row.count;
    if (row.status === 'submitted' && row.decision === 'reject') current.pendingRejected = row.count;
  }
  const representatives = Array.from(representativeMap.entries()).map(([name, counts]) => ({ name, ...counts }));
  const hasRepresentativeVotes = representatives.some(
    (row) => row.approved || row.rejected || row.pendingApproved || row.pendingRejected
  );

  const submitted = statusMap['submitted'] ?? 0;
  const verified = statusMap['verified'] ?? 0;
  const rejected = statusMap['rejected'] ?? 0;
  const offline =
    (offlineMap['juristic'] ?? 0) +
    (offlineMap['municipality'] ?? 0) +
    (offlineMap['abstain'] ?? 0) +
    (offlineMap['follow_majority'] ?? 0);

  return NextResponse.json({
    totalHouseholds: households.count,
    total: submitted + verified + rejected + offline,
    submitted,
    verified,
    rejected,
    juristic: choiceMap['juristic'] ?? 0,
    municipality: choiceMap['municipality'] ?? 0,
    abstain: choiceMap['abstain'] ?? 0,
    follow_majority: choiceMap['follow_majority'] ?? 0,
    offline,
    juristic_offline: offlineMap['juristic'] ?? 0,
    municipality_offline: offlineMap['municipality'] ?? 0,
    abstain_offline: offlineMap['abstain'] ?? 0,
    follow_majority_offline: offlineMap['follow_majority'] ?? 0,
    representatives,
    hasRepresentativeVotes,
  });
}
