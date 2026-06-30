import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [households] = await sql`
    SELECT COUNT(*)::int AS count FROM households WHERE is_active = true
  `;

  const statusRows = await sql`
    SELECT status, COUNT(*)::int AS count FROM ballots GROUP BY status
  `;
  const statusMap: Record<string, number> = {};
  for (const row of statusRows) statusMap[row.status] = row.count;

  const choiceRows = await sql`
    SELECT choice, status, COUNT(*)::int AS count
    FROM ballots
    WHERE status IN ('verified', 'submitted')
    GROUP BY choice, status
  `;
  const choiceMap: Record<string, number> = {};
  const pendingMap: Record<string, number> = {};
  for (const row of choiceRows) {
    if (row.status === 'verified') choiceMap[row.choice] = row.count;
    else if (row.status === 'submitted') pendingMap[row.choice] = row.count;
  }

  const submitted = statusMap['submitted'] ?? 0;
  const verified = statusMap['verified'] ?? 0;
  const rejected = statusMap['rejected'] ?? 0;
  const total = submitted + verified + rejected;

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
  });
}
