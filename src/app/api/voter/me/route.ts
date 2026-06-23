import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getVoterSession } from '@/lib/session';

export async function GET() {
  const session = await getVoterSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const households = await sql`
    SELECT house_no, owner_name FROM households WHERE id = ${session.householdId} LIMIT 1
  `;
  const household = households[0];

  const ballots = await sql`
    SELECT id, status FROM ballots
    WHERE household_id = ${session.householdId}
    ORDER BY submitted_at DESC
    LIMIT 1
  `;
  const ballot = ballots[0];

  return NextResponse.json({
    house_no: household?.house_no ?? session.houseNo,
    owner_name: household?.owner_name ?? session.ownerName,
    ballot: ballot ?? null,
  });
}
