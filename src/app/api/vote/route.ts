import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getVoterSession } from '@/lib/session';
import type { VoteChoice } from '@/lib/types';

const VALID_CHOICES: VoteChoice[] = ['juristic', 'municipality', 'abstain', 'follow_majority'];

export async function POST(req: NextRequest) {
  const session = await getVoterSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [config] = await sql`
    SELECT starts_at, ends_at, is_active
    FROM vote_config
    WHERE is_active = true
    ORDER BY id DESC
    LIMIT 1
  `;
  if (!config || !config.is_active) {
    return NextResponse.json({ error: 'ระบบลงมติปิดอยู่ในขณะนี้' }, { status: 403 });
  }
  const now = new Date();
  if (config.starts_at && now < new Date(config.starts_at)) {
    return NextResponse.json({ error: 'ยังไม่ถึงเวลาเปิดลงมติ' }, { status: 403 });
  }
  if (config.ends_at && now > new Date(config.ends_at)) {
    return NextResponse.json({ error: 'ปิดรับการลงมติแล้ว' }, { status: 403 });
  }

  const [existing] = await sql`
    SELECT id FROM ballots WHERE household_id = ${session.householdId} LIMIT 1
  `;
  if (existing) {
    return NextResponse.json({ error: 'หลังคาเรือนนี้ได้ลงมติไปแล้ว' }, { status: 409 });
  }

  const body = await req.json();
  const choice = String(body.choice ?? '') as VoteChoice;
  const voterName = String(body.voter_name ?? '').trim();
  const isProxy = body.is_proxy === true || body.is_proxy === 'true';
  const proxyName = String(body.proxy_name ?? '').trim();

  if (!VALID_CHOICES.includes(choice)) {
    return NextResponse.json({ error: 'กรุณาเลือกมติให้ถูกต้อง' }, { status: 400 });
  }
  if (!voterName) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุลผู้ลงมติ' }, { status: 400 });
  }
  if (isProxy && !proxyName) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อผู้รับมอบฉันทะ' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;

  const [ballot] = await sql`
    INSERT INTO ballots (household_id, voter_name, is_proxy, proxy_name, choice, status, ip_address)
    VALUES (${session.householdId}, ${voterName}, ${isProxy},
            ${isProxy ? proxyName : null}, ${choice}, 'submitted', ${ip})
    RETURNING id
  `;

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, ip_address)
    VALUES (${session.houseNo}, 'ballot_submitted', ${ballot.id}, ${ip})
  `;

  return NextResponse.json({ success: true });
}
