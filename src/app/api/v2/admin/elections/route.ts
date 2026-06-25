import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2Admin } from '@/lib/v2';

export async function POST(req: NextRequest) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    account_id?: string;
    title?: string;
    description?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    is_active?: boolean;
  };

  const accountId = body.account_id?.trim();
  const title = body.title?.trim();
  if (!accountId || !title) {
    return NextResponse.json({ error: 'กรุณาระบุบัญชีและชื่อการเลือกตั้ง' }, { status: 400 });
  }

  const account = await sql`SELECT id FROM v2_accounts WHERE id = ${accountId} LIMIT 1`;
  if (!account[0]) {
    return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });
  }

  const description = body.description?.trim() || null;
  const startsAt = body.starts_at || null;
  const endsAt = body.ends_at || null;
  const isActive = body.is_active === true;

  const rows = await sql`
    INSERT INTO v2_elections (account_id, title, description, starts_at, ends_at, is_active)
    VALUES (${accountId}, ${title}, ${description}, ${startsAt}, ${endsAt}, ${isActive})
    RETURNING id, account_id, title, description, starts_at, ends_at, is_active
  `;

  return NextResponse.json({ success: true, election: rows[0] });
}
