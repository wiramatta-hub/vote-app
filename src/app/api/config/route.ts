import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const rows = await sql`
    SELECT vote_title, village_name, option_a_label, option_b_label, starts_at, ends_at, is_active
    FROM vote_config
    ORDER BY created_at ASC
    LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่าการลงมติ' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}
