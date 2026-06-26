import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2User } from '@/lib/v2';

export async function POST(req: NextRequest) {
  const session = await getV2User();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    INSERT INTO v2_elections (account_id, title, description, starts_at, ends_at, is_active)
    VALUES (${session.accountId}, ${title}, ${description}, ${startsAt}, ${endsAt}, ${isActive})
    RETURNING id, title, description, starts_at, ends_at, is_active
  `;

  return NextResponse.json({ success: true, election: rows[0] });
}
