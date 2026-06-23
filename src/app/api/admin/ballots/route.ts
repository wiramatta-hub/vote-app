import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const ballots =
    status && ['submitted', 'verified', 'rejected'].includes(status)
      ? await sql`
          SELECT b.*, h.house_no, h.owner_name
          FROM ballots b
          JOIN households h ON h.id = b.household_id
          WHERE b.status = ${status}
          ORDER BY b.submitted_at ASC
        `
      : await sql`
          SELECT b.*, h.house_no, h.owner_name
          FROM ballots b
          JOIN households h ON h.id = b.household_id
          ORDER BY b.submitted_at ASC
        `;

  const ballotIds = ballots.map((b) => b.id);
  const docs = ballotIds.length
    ? await sql`SELECT * FROM documents WHERE ballot_id = ANY(${ballotIds})`
    : [];

  const result = ballots.map((b) => ({
    ...b,
    household: { house_no: b.house_no, owner_name: b.owner_name },
    documents: docs.filter((d) => d.ballot_id === b.id),
  }));

  return NextResponse.json(result);
}
