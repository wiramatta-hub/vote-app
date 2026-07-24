import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getVoterSession } from '@/lib/session';
import {
  hasCompleteRepresentativeVotes,
  normalizeRepresentativeVotes,
} from '@/lib/representatives';

const VALID_CHOICES = ['juristic', 'municipality', 'abstain', 'follow_majority'];
const DEFAULT_REPRESENTATIVE_CHOICE = 'juristic';

export async function POST(req: NextRequest) {
  const session = await getVoterSession();
  if (!session) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const configs = await sql`
    SELECT starts_at, ends_at, is_active
    FROM vote_config
    ORDER BY created_at ASC
    LIMIT 1
  `;
  const config = configs[0];
  if (!config || !config.is_active) {
    return NextResponse.json({ error: 'ยังไม่เปิดให้ลงมติในขณะนี้' }, { status: 403 });
  }

  const now = Date.now();
  const startsAt = config.starts_at ? new Date(config.starts_at).getTime() : null;
  const endsAt = config.ends_at ? new Date(config.ends_at).getTime() : null;

  if (startsAt && now < startsAt) {
    return NextResponse.json({ error: 'ยังไม่ถึงเวลาเริ่มลงมติ' }, { status: 403 });
  }
  if (endsAt && now > endsAt) {
    return NextResponse.json({ error: 'หมดเวลาลงมติแล้ว' }, { status: 403 });
  }

  const body = await req.json();
  const representativeVotes = normalizeRepresentativeVotes(body.representative_votes);
  const hasRepresentativeVotes = hasCompleteRepresentativeVotes(representativeVotes);
  const choice = hasRepresentativeVotes ? DEFAULT_REPRESENTATIVE_CHOICE : (body.choice as string);
  const voterName = (body.voter_name as string)?.trim();
  const isProxy = body.is_proxy === true;

  if (!choice || !voterName) {
    return NextResponse.json(
      { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
      { status: 400 }
    );
  }

  if (!hasRepresentativeVotes && !VALID_CHOICES.includes(choice)) {
    return NextResponse.json({ error: 'ตัวเลือกไม่ถูกต้อง' }, { status: 400 });
  }

  if (!choice || (!hasRepresentativeVotes && !VALID_CHOICES.includes(choice))) {
    return NextResponse.json({ error: 'กรุณาเลือกมติ' }, { status: 400 });
  }

  if (body.representative_votes && !hasRepresentativeVotes) {
    return NextResponse.json({ error: 'กรุณาเลือกเห็นชอบหรือไม่เห็นชอบให้ครบทุกท่าน' }, { status: 400 });
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
    INSERT INTO ballots (household_id, voter_name, is_proxy, proxy_name, choice, representative_votes, status, ip_address)
    VALUES (
      ${session.householdId}, ${voterName}, ${isProxy},
      ${null}, ${choice}, ${hasRepresentativeVotes ? JSON.stringify(representativeVotes) : null}::jsonb, 'submitted', ${ip}
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
      ${JSON.stringify({ choice, is_proxy: isProxy, representative_votes: representativeVotes })}, ${ip}
    )
  `;

  return NextResponse.json({ success: true, ballotId: ballot.id });
}
