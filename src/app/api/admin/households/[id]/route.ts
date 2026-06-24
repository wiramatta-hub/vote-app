import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    house_no?: string;
    owner_name?: string;
    is_active?: boolean;
  };

  const houseNo = body.house_no?.trim();
  const ownerName = body.owner_name?.trim();

  if (!houseNo || !ownerName) {
    return NextResponse.json(
      { error: 'ข้อมูลไม่ครบถ้วน: ต้องมีบ้านเลขที่ และชื่อเจ้าบ้าน' },
      { status: 400 }
    );
  }

  const existing = await sql`SELECT id FROM households WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบบ้านเลขที่นี้' }, { status: 404 });
  }

  // Ensure house_no is unique across other households
  const duplicate = await sql`
    SELECT id FROM households WHERE house_no = ${houseNo} AND id <> ${id} LIMIT 1
  `;
  if (duplicate[0]) {
    return NextResponse.json(
      { error: `บ้านเลขที่ ${houseNo} มีอยู่แล้วในระบบ` },
      { status: 409 }
    );
  }

  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true;

  const updated = await sql`
    UPDATE households
    SET house_no = ${houseNo},
        owner_name = ${ownerName},
        is_active = ${isActive}
    WHERE id = ${id}
    RETURNING id, house_no, owner_name, invite_code, is_active
  `;

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata)
    VALUES (${session.username}, 'household_updated', ${id}, ${JSON.stringify({ house_no: houseNo })})
  `;

  return NextResponse.json({ success: true, household: updated[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await sql`SELECT id, house_no FROM households WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบบ้านเลขที่นี้' }, { status: 404 });
  }

  // Remove dependent records first to satisfy foreign keys
  await sql`
    DELETE FROM documents
    WHERE ballot_id IN (SELECT id FROM ballots WHERE household_id = ${id})
  `;
  await sql`DELETE FROM ballots WHERE household_id = ${id}`;
  await sql`DELETE FROM households WHERE id = ${id}`;

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata)
    VALUES (${session.username}, 'household_deleted', ${id}, ${JSON.stringify({ house_no: existing[0].house_no })})
  `;

  return NextResponse.json({ success: true });
}
