import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signToken, ADMIN_COOKIE } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body as { username: string; password: string };

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }

  const admins = await sql`
    SELECT * FROM admin_users WHERE username = ${username.trim()} LIMIT 1
  `;
  const admin = admins[0];

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return NextResponse.json(
      { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
      { status: 401 }
    );
  }

  const token = await signToken(
    { adminId: admin.id, username: admin.username, role: admin.role },
    '8h'
  );

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  await sql`
    INSERT INTO audit_logs (actor, action, target_id, ip_address)
    VALUES (${admin.username}, 'admin_login', ${admin.id}, ${ip})
  `;

  const response = NextResponse.json({ success: true, role: admin.role });

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });

  return response;
}
