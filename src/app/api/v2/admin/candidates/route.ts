import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2Admin } from '@/lib/v2';

export async function POST(req: NextRequest) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    election_id?: string;
    candidate_no?: number;
    candidate_name?: string;
    candidate_image_url?: string;
    display_order?: number;
  };

  const electionId = body.election_id?.trim();
  const candidateName = body.candidate_name?.trim();
  const candidateImageUrl = body.candidate_image_url?.trim() || null;
  const candidateNo = Number(body.candidate_no);

  if (!electionId || !candidateName || !Number.isFinite(candidateNo)) {
    return NextResponse.json(
      { error: 'กรุณาระบุการเลือกตั้ง หมายเลข และชื่อผู้สมัคร' },
      { status: 400 }
    );
  }

  const election = await sql`SELECT id FROM v2_elections WHERE id = ${electionId} LIMIT 1`;
  if (!election[0]) {
    return NextResponse.json({ error: 'ไม่พบการเลือกตั้ง' }, { status: 404 });
  }

  const dup = await sql`
    SELECT id FROM v2_candidates
    WHERE election_id = ${electionId} AND candidate_no = ${candidateNo}
    LIMIT 1
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
    INSERT INTO v2_candidates (
      election_id,
      candidate_no,
      candidate_name,
      candidate_image_url,
      display_order,
      is_active
    )
    VALUES (
      ${electionId},
      ${candidateNo},
      ${candidateName},
      ${candidateImageUrl},
      ${displayOrder},
      true
    )
    RETURNING id, election_id, candidate_no, candidate_name, candidate_image_url, display_order, is_active
  `;

  return NextResponse.json({ success: true, candidate: rows[0] });
}
