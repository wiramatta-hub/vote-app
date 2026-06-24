import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getVoterSession } from '@/lib/session';

const VALID_CHOICES = ['juristic', 'municipality', 'abstain', 'follow_majority'];

export async function POST(req: NextRequest) {
  const session = await getVoterSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const body = await req.json();
  const choice = body.choice as string;
  const voterName = (body.voter_name as string)?.trim();
  const isProxy = body.is_proxy === true;
  const proxyName = (body.proxy_name as string)?.trim() || null;

  if (!choice || !voterName) {
    return NextResponse.json(
      { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
      { status: 400 }
    );
  }

  if (!VALID_CHOICES.includes(choice)) {
    return NextResponse.json({ error: 'ตัวเลือกไม่ถูกต้อง' }, { status: 400 });
  }

  if (isProxy && !proxyName) {
    return NextResponse.json(
      { error: 'กรณีมอบฉันทะต้องระบุชื่อผู้มอบฉันทะ' },
      { status: 400 }
    );
  }

  // Prevent double voting
  const existing = await sql`
    SELECT id FROM ballots
    WHERE household_id = ${session.householdId}
      AND status IN ('submitted', 'verified')
    LIMIT 1
  `;
  if (existing[0]) {
    return NextResponse.json(
      { error: 'บ้านเลขที่นี้ได้ส่งมติแล้ว ไม่สามารถส่งซ้ำได้' },
      { status: 409 }
    );
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');

  const ballots = await sql`
    INSERT INTO ballots (household_id, voter_name, is_proxy, proxy_name, choice, status, ip_address)
    VALUES (
      ${session.householdId}, ${voterName}, ${isProxy},
      ${isProxy ? proxyName : null}, ${choice}, 'submitted', ${ip}
    )
    RETURNING id
  `;
  const ballot = ballots[0];

  if (!ballot) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง' }, { status: 500 });
  }

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata, ip_address)
    VALUES (
      ${session.houseNo}, 'vote_submitted', ${ballot.id},
      ${JSON.stringify({ choice, is_proxy: isProxy })}, ${ip}
    )
  `;

  return NextResponse.json({ success: true, ballotId: ballot.id });
}
