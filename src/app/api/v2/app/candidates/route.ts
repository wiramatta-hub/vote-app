import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2User } from '@/lib/v2';

export async function POST(req: NextRequest) {
  const session = await getV2User();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    election_id?: string;
    candidate_no?: number;
    candidate_name?: string;
    display_order?: number;
  };

  const electionId = body.election_id?.trim();
  const candidateName = body.candidate_name?.trim();
  const candidateNo = Number(body.candidate_no);

  if (!electionId || !candidateName || !Number.isFinite(candidateNo)) {
    return NextResponse.json(
      { error: 'กรุณาระบุการเลือกตั้ง หมายเลข และชื่อผู้สมัคร' },
      { status: 400 }
    );
  }

  const owns = await sql`
    SELECT id FROM v2_elections WHERE id = ${electionId} AND account_id = ${session.accountId} LIMIT 1
  `;
  if (!owns[0]) {
    return NextResponse.json({ error: 'ไม่พบการเลือกตั้ง' }, { status: 404 });
  }

  const dup = await sql`
    SELECT id FROM v2_candidates
    WHERE election_id = ${electionId} AND candidate_no = ${candidateNo} LIMIT 1
  `;
  if (dup[0]) {
    return NextResponse.json(
      { error: `หมายเลข ${candidateNo} มีอยู่แล้วในการเลือกตั้งนี้` },
      { status: 409 }
    );
  }

  const displayOrder = Number.isFinite(Number(body.display_order))
    ? Number(body.display_order)
    : candidateNo;

  const rows = await sql`
    INSERT INTO v2_candidates (election_id, candidate_no, candidate_name, display_order, is_active)
    VALUES (${electionId}, ${candidateNo}, ${candidateName}, ${displayOrder}, true)
    RETURNING id, election_id, candidate_no, candidate_name, display_order, is_active
  `;

  return NextResponse.json({ success: true, candidate: rows[0] });
}
