import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2Admin } from '@/lib/v2';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    candidate_no?: number;
    candidate_name?: string;
    candidate_image_url?: string;
    display_order?: number;
    is_active?: boolean;
  };

  const candidateName = body.candidate_name?.trim();
  const candidateImageUrl = body.candidate_image_url?.trim() || null;
  const candidateNo = Number(body.candidate_no);
  if (!candidateName || !Number.isFinite(candidateNo)) {
    return NextResponse.json(
      { error: 'กรุณาระบุหมายเลขและชื่อผู้สมัคร' },
      { status: 400 }
    );
  }

  const current = await sql`SELECT election_id FROM v2_candidates WHERE id = ${id} LIMIT 1`;
  if (!current[0]) {
    return NextResponse.json({ error: 'ไม่พบผู้สมัคร' }, { status: 404 });
  }

  const dup = await sql`
    SELECT id FROM v2_candidates
    WHERE election_id = ${current[0].election_id}
      AND candidate_no = ${candidateNo}
      AND id <> ${id}
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
  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true;

  const rows = await sql`
    UPDATE v2_candidates
    SET candidate_no = ${candidateNo},
        candidate_name = ${candidateName},
      candidate_image_url = ${candidateImageUrl},
        display_order = ${displayOrder},
        is_active = ${isActive}
    WHERE id = ${id}
    RETURNING id, election_id, candidate_no, candidate_name, candidate_image_url, display_order, is_active
  `;

  return NextResponse.json({ success: true, candidate: rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await sql`SELECT id FROM v2_candidates WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบผู้สมัคร' }, { status: 404 });
  }

  await sql`DELETE FROM v2_candidates WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
