import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signToken, VOTER_COOKIE } from '@/lib/session';

function genInviteCode() {
  return Array.from({ length: 8 }, () =>
    '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
  ).join('');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { house_no, owner_name } = body as Record<string, string>;

  const houseNo = house_no?.trim() ?? '';
  const ownerName = owner_name?.trim() ?? '';

  if (!houseNo && !ownerName) {
    return NextResponse.json({ error: 'กรุณากรอกบ้านเลขที่หรือชื่อ-นามสกุลอย่างน้อย 1 ช่อง' }, { status: 400 });
  }

  let household;

  if (houseNo) {
    const found = await sql`
      SELECT * FROM households WHERE house_no = ${houseNo} LIMIT 1
    `;
    household = found[0];

    // ไม่พบบ้านเลขที่: สร้างใหม่อัตโนมัติเฉพาะกรณีที่มีชื่อส่งมาด้วย
    if (!household && ownerName) {
      const created = await sql`
        INSERT INTO households (house_no, owner_name, invite_code, is_active)
        VALUES (${houseNo}, ${ownerName}, ${genInviteCode()}, true)
        RETURNING *
      `;
      household = created[0];
    }

    if (!household) {
      return NextResponse.json({ error: 'ไม่พบบ้านเลขที่นี้ กรุณาตรวจสอบอีกครั้ง' }, { status: 404 });
    }
  } else {
    // ค้นด้วยชื่ออย่างเดียว: ต้องเจอได้ชัดเจนเพียง 1 หลัง
    const matches = await sql`
      SELECT *
      FROM households
      WHERE owner_name ILIKE ${`%${ownerName}%`}
      ORDER BY house_no
      LIMIT 2
    `;

    if (matches.length === 0) {
      return NextResponse.json({ error: 'ไม่พบชื่อในระบบ กรุณาตรวจสอบอีกครั้ง' }, { status: 404 });
    }

    if (matches.length > 1) {
      return NextResponse.json(
        { error: 'พบชื่อซ้ำในหลายบ้าน กรุณากรอกบ้านเลขที่เพื่อยืนยันตัวตน' },
        { status: 400 }
      );
    }

    household = matches[0];
  }

  if (!household.is_active) {
    return NextResponse.json(
      { error: 'บ้านเลขที่นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
      { status: 403 }
    );
  } else if (!household.owner_name) {
    // อัปเดตชื่อเจ้าบ้านถ้ายังว่าง
    await sql`UPDATE households SET owner_name = ${ownerName} WHERE id = ${household.id}`;
    household.owner_name = ownerName;
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
