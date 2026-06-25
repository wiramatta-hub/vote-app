import { NextRequest, NextResponse } from 'next/server';
import { signV2AdminToken, V2_ADMIN_COOKIE } from '@/lib/v2';

export async function POST(req: NextRequest) {
  const expected = process.env.V2_ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่า V2_ADMIN_PASSWORD ในระบบ' },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? '';

  if (!password || password !== expected) {
    return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  const token = await signV2AdminToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(V2_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return response;
}
