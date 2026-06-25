import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2Admin, slugify } from '@/lib/v2';

const VALID_TYPES = ['village', 'school', 'organization'];

export async function POST(req: NextRequest) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    account_type?: string;
  };

  const name = body.name?.trim();
  const accountType = body.account_type?.trim() || 'village';
  let slug = body.slug?.trim() ? slugify(body.slug) : slugify(name ?? '');

  if (!name) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อบัญชี' }, { status: 400 });
  }
  if (!slug) slug = `account-${Date.now()}`;
  if (!VALID_TYPES.includes(accountType)) {
    return NextResponse.json({ error: 'ประเภทบัญชีไม่ถูกต้อง' }, { status: 400 });
  }

  const dup = await sql`SELECT id FROM v2_accounts WHERE slug = ${slug} LIMIT 1`;
  if (dup[0]) {
    return NextResponse.json({ error: `slug "${slug}" มีอยู่แล้ว` }, { status: 409 });
  }

  const rows = await sql`
    INSERT INTO v2_accounts (slug, name, account_type, is_active)
    VALUES (${slug}, ${name}, ${accountType}, true)
    RETURNING id, slug, name, account_type, is_active
  `;

  return NextResponse.json({ success: true, account: rows[0] });
}
