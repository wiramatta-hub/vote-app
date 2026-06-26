import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2User } from '@/lib/v2';

export async function PATCH(req: NextRequest) {
  const session = await getV2User();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อหน่วยงาน' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE v2_accounts SET name = ${name}
    WHERE id = ${session.accountId}
    RETURNING id, slug, name, account_type, is_active
  `;
  if (!rows[0]) return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });

  return NextResponse.json({ success: true, account: rows[0] });
}
