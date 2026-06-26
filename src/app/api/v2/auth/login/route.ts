import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  verifyPassword,
  signV2UserToken,
  V2_USER_COOKIE,
  isMissingTableError,
} from '@/lib/v2';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  const username = body.username?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!username || !password) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT u.id, u.username, u.password_hash, u.is_active,
             a.id AS account_id, a.slug AS account_slug, a.is_active AS account_active
      FROM v2_users u
      JOIN v2_accounts a ON a.id = u.account_id
      WHERE u.username = ${username}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }
    if (!user.is_active || !user.account_active) {
      return NextResponse.json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' }, { status: 403 });
    }

    const token = await signV2UserToken({
      userId: user.id,
      accountId: user.account_id,
      accountSlug: user.account_slug,
      username: user.username,
    });

    const response = NextResponse.json({
      success: true,
      account: { slug: user.account_slug },
    });
    response.cookies.set(V2_USER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'V2 schema not initialized' }, { status: 503 });
    }
    return NextResponse.json({ error: 'ไม่สามารถเข้าสู่ระบบได้' }, { status: 500 });
  }
}
