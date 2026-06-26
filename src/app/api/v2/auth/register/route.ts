import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hashPassword, slugify, isMissingTableError } from '@/lib/v2';

const VALID_TYPES = ['village', 'school', 'organization'];

function isValidUsername(u: string): boolean {
  return /^[a-zA-Z0-9_.-]{4,32}$/.test(u);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    org_name?: string;
    account_type?: string;
    username?: string;
    password?: string;
    display_name?: string;
    email?: string;
    phone?: string;
  };

  const orgName = body.org_name?.trim();
  const accountType = body.account_type?.trim() || 'school';
  const username = body.username?.trim().toLowerCase();
  const password = body.password ?? '';
  const displayName = body.display_name?.trim() || null;
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;

  if (!orgName) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อหน่วยงาน/โรงเรียน' }, { status: 400 });
  }
  if (!username || !isValidUsername(username)) {
    return NextResponse.json(
      { error: 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ . - ความยาว 4-32 ตัว' },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(accountType)) {
    return NextResponse.json({ error: 'ประเภทหน่วยงานไม่ถูกต้อง' }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const existing = await sql`SELECT id FROM v2_users WHERE username = ${username} LIMIT 1`;
    if (existing[0]) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }, { status: 409 });
    }

    // unique slug
    let baseSlug = slugify(orgName);
    if (!baseSlug) baseSlug = `org-${Date.now()}`;
    let slug = baseSlug;
    let n = 1;
    while (true) {
      const dup = await sql`SELECT id FROM v2_accounts WHERE slug = ${slug} LIMIT 1`;
      if (!dup[0]) break;
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const accountRows = await sql`
      INSERT INTO v2_accounts (slug, name, account_type, is_active)
      VALUES (${slug}, ${orgName}, ${accountType}, true)
      RETURNING id, slug
    `;
    const account = accountRows[0];

    const passwordHash = await hashPassword(password);
    await sql`
      INSERT INTO v2_users (account_id, username, email, phone, display_name, password_hash)
      VALUES (${account.id}, ${username}, ${email}, ${phone}, ${displayName}, ${passwordHash})
    `;

    return NextResponse.json({ success: true, account: { slug: account.slug } });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'V2 schema not initialized' }, { status: 503 });
    }
    return NextResponse.json({ error: 'ไม่สามารถสมัครสมาชิกได้' }, { status: 500 });
  }
}
