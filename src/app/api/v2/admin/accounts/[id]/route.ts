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
    name?: string;
    is_active?: boolean;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อบัญชี' }, { status: 400 });
  }
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true;

  const rows = await sql`
    UPDATE v2_accounts
    SET name = ${name}, is_active = ${isActive}
    WHERE id = ${id}
    RETURNING id, slug, name, account_type, is_active
  `;
  if (!rows[0]) {
    return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });
  }

  return NextResponse.json({ success: true, account: rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await sql`SELECT id FROM v2_accounts WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });
  }

  await sql`DELETE FROM v2_accounts WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
