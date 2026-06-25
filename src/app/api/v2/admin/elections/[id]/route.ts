import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2Admin } from '@/lib/v2';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active?: boolean;
  };

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อการเลือกตั้ง' }, { status: 400 });
  }

  const description = body.description?.trim() || null;
  const startsAt = body.starts_at || null;
  const endsAt = body.ends_at || null;
  const isActive = body.is_active === true;

  const rows = await sql`
    UPDATE v2_elections
    SET title = ${title},
        description = ${description},
        starts_at = ${startsAt},
        ends_at = ${endsAt},
        is_active = ${isActive}
    WHERE id = ${id}
    RETURNING id, account_id, title, description, starts_at, ends_at, is_active
  `;
  if (!rows[0]) {
    return NextResponse.json({ error: 'ไม่พบการเลือกตั้ง' }, { status: 404 });
  }

  return NextResponse.json({ success: true, election: rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await sql`SELECT id FROM v2_elections WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบการเลือกตั้ง' }, { status: 404 });
  }

  await sql`DELETE FROM v2_elections WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
