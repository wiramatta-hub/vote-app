import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signToken, VOTER_COOKIE } from '@/lib/session';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { house_no, invite_code, id_card_last4 } = body as Record<string, string>;

  if (!house_no?.trim() || !invite_code?.trim() || !id_card_last4?.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  }

  const households = await sql`
    SELECT * FROM households
    WHERE house_no = ${house_no.trim()}
      AND invite_code = ${invite_code.trim().toUpperCase()}
      AND id_card_last4 = ${id_card_last4.trim()}
      AND is_active = true
    LIMIT 1
  `;
  const household = households[0];

  if (!household) {
    return NextResponse.json(
      { error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบบ้านเลขที่ รหัสเชิญ และเลขบัตรประชาชน 4 ตัวท้าย' },
      { status: 401 }
    );
  }

  if (household.invite_expires_at && new Date(household.invite_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'รหัสเชิญหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ' },
      { status: 401 }
    );
  }

  const existing = await sql`
    SELECT id, status FROM ballots
    WHERE household_id = ${household.id}
      AND status IN ('submitted', 'verified')
    LIMIT 1
  `;
  const existingBallot = existing[0];

  const token = await signToken({
    householdId: household.id,
    houseNo: household.house_no,
    ownerName: household.owner_name,
  });

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  await sql`
    INSERT INTO audit_logs (actor, action, target_id, ip_address)
    VALUES (${household.house_no}, 'voter_login', ${household.id}, ${ip})
  `;

  const response = NextResponse.json({
    success: true,
    household: {
      house_no: household.house_no,
      owner_name: household.owner_name,
    },
    hasVoted: !!existingBallot,
    voteStatus: existingBallot?.status ?? null,
  });

  response.cookies.set(VOTER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return response;
}
