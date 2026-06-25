import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isMissingTableError } from '@/lib/v2';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    candidate_id?: string;
    voter_name?: string;
    voter_key?: string;
  };

  const candidateId = body.candidate_id?.trim();
  const voterName = body.voter_name?.trim();
  const voterKey = (body.voter_key?.trim() || voterName || '').toLowerCase();

  if (!candidateId || !voterName) {
    return NextResponse.json(
      { error: 'กรุณาเลือกผู้สมัครและกรอกชื่อผู้ลงคะแนน' },
      { status: 400 }
    );
  }

  try {
    const accountRows = await sql`
      SELECT id FROM v2_accounts WHERE slug = ${slug} AND is_active = true LIMIT 1
    `;
    const account = accountRows[0];
    if (!account) {
      return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });
    }

    const electionRows = await sql`
      SELECT id, starts_at, ends_at
      FROM v2_elections
      WHERE account_id = ${account.id} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const election = electionRows[0];
    if (!election) {
      return NextResponse.json({ error: 'ยังไม่มีการเลือกตั้งที่เปิดอยู่' }, { status: 400 });
    }

    const now = Date.now();
    if (election.starts_at && new Date(election.starts_at).getTime() > now) {
      return NextResponse.json({ error: 'ยังไม่ถึงเวลาเปิดลงคะแนน' }, { status: 400 });
    }
    if (election.ends_at && new Date(election.ends_at).getTime() < now) {
      return NextResponse.json({ error: 'ปิดลงคะแนนแล้ว' }, { status: 400 });
    }

    const candidateRows = await sql`
      SELECT id FROM v2_candidates
      WHERE id = ${candidateId} AND election_id = ${election.id} AND is_active = true
      LIMIT 1
    `;
    if (!candidateRows[0]) {
      return NextResponse.json({ error: 'ไม่พบผู้สมัครในการเลือกตั้งนี้' }, { status: 400 });
    }

    const existing = await sql`
      SELECT id FROM v2_ballots
      WHERE election_id = ${election.id} AND voter_key = ${voterKey}
      LIMIT 1
    `;
    if (existing[0]) {
      return NextResponse.json({ error: 'ชื่อนี้ลงคะแนนไปแล้ว' }, { status: 409 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');

    await sql`
      INSERT INTO v2_ballots (account_id, election_id, candidate_id, voter_key, voter_name, ip_address)
      VALUES (${account.id}, ${election.id}, ${candidateId}, ${voterKey}, ${voterName}, ${ip})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'V2 schema not initialized' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'ไม่สามารถบันทึกคะแนนได้' }, { status: 500 });
  }
}
