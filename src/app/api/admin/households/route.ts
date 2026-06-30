import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { randomBytes } from 'crypto';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const households = await sql`SELECT * FROM households ORDER BY house_no`;
  const householdIds = households.map((h) => h.id);
  const ballots = householdIds.length
    ? await sql`SELECT id, status, household_id, is_offline, choice FROM ballots WHERE household_id = ANY(${householdIds})`
    : [];

  const result = households.map((h) => ({
    ...h,
    ballots: ballots
      .filter((b) => b.household_id === h.id)
      .map((b) => ({ id: b.id, status: b.status, is_offline: b.is_offline, choice: b.choice })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { households } = (await req.json()) as {
    households: { house_no: string; owner_name: string }[];
  };

  if (!Array.isArray(households) || households.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  for (const h of households) {
    if (!h.house_no?.trim() || !h.owner_name?.trim()) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน: ต้องมี house_no, owner_name' },
        { status: 400 }
      );
    }
  }

  let count = 0;
  for (const h of households) {
    await sql`
      INSERT INTO households (house_no, owner_name, invite_code, is_active)
      VALUES (
        ${h.house_no.trim()}, ${h.owner_name.trim()},
        ${randomBytes(4).toString('hex').toUpperCase()}, true
      )
      ON CONFLICT (house_no) DO UPDATE
      SET owner_name = EXCLUDED.owner_name,
          is_active = true
    `;
    count++;
  }

  await sql`
    INSERT INTO audit_logs (actor, action, metadata)
    VALUES (${session.username}, 'households_imported', ${JSON.stringify({ count })})
  `;

  return NextResponse.json({ success: true, count });
}
