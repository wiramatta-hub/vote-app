import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    house_no?: string;
    owner_name?: string;
    is_active?: boolean;
    voteStatus?: 'none' | 'pending' | 'voted' | 'offline';
    voteChoice?: 'juristic' | 'municipality' | 'abstain' | 'follow_majority';
  };

  const houseNo = body.house_no?.trim();
  const ownerName = body.owner_name?.trim();

  if (!houseNo || !ownerName) {
    return NextResponse.json(
      { error: 'ข้อมูลไม่ครบถ้วน: ต้องมีบ้านเลขที่ และชื่อเจ้าบ้าน' },
      { status: 400 }
    );
  }

  const existing = await sql`SELECT id FROM households WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบบ้านเลขที่นี้' }, { status: 404 });
  }

  // Ensure house_no is unique across other households
  const duplicate = await sql`
    SELECT id FROM households WHERE house_no = ${houseNo} AND id <> ${id} LIMIT 1
  `;
  if (duplicate[0]) {
    return NextResponse.json(
      { error: `บ้านเลขที่ ${houseNo} มีอยู่แล้วในระบบ` },
      { status: 409 }
    );
  }

  const isActive = typeof body.is_active === 'boolean' ? body.is_active : true;

  const updated = await sql`
    UPDATE households
    SET house_no = ${houseNo},
        owner_name = ${ownerName},
        is_active = ${isActive}
    WHERE id = ${id}
    RETURNING id, house_no, owner_name, invite_code, is_active
  `;

  // Optional: admin manually sets the vote status for this household
  if (body.voteStatus) {
    // Manual voting is only allowed after the online voting window has closed
    const [config] = await sql`
      SELECT starts_at, ends_at, is_active FROM vote_config ORDER BY created_at ASC LIMIT 1
    `;
    const now = Date.now();
    const endsAt = config?.ends_at ? new Date(config.ends_at).getTime() : null;
    const startsAt = config?.starts_at ? new Date(config.starts_at).getTime() : null;
    const votingOpen = Boolean(
      config?.is_active &&
      (startsAt === null || now >= startsAt) &&
      (endsAt === null || now <= endsAt)
    );
    if (votingOpen) {
      return NextResponse.json(
        { error: 'ยังไม่สามารถลงมติด้วยมือได้ จนกว่าจะปิดการลงมติออนไลน์' },
        { status: 403 }
      );
    }

    // Households that already voted online cannot be edited manually
    const onlineBallot = await sql`
      SELECT id FROM ballots WHERE household_id = ${id} AND is_offline = false LIMIT 1
    `;
    if (onlineBallot[0]) {
      return NextResponse.json(
        { error: 'บ้านนี้ลงมติออนไลน์แล้ว ไม่สามารถลงมติด้วยมือได้' },
        { status: 409 }
      );
    }

    const validChoices = ['juristic', 'municipality', 'abstain', 'follow_majority'];
    if (body.voteStatus !== 'none' && !validChoices.includes(body.voteChoice ?? '')) {
      return NextResponse.json(
        { error: 'กรุณาเลือกตัวเลือกการลงมติ' },
        { status: 400 }
      );
    }

    // Replace any existing (offline) ballots for this household with the new manual state
    await sql`
      DELETE FROM documents
      WHERE ballot_id IN (SELECT id FROM ballots WHERE household_id = ${id})
    `;
    await sql`DELETE FROM ballots WHERE household_id = ${id}`;

    if (body.voteStatus !== 'none') {
      const status = body.voteStatus === 'pending' ? 'submitted' : 'verified';
      const isOffline = body.voteStatus === 'offline';
      const reviewedBy = status === 'verified' ? session.username : null;
      await sql`
        INSERT INTO ballots (household_id, voter_name, is_proxy, choice, status, is_offline, reviewed_by, reviewed_at)
        VALUES (
          ${id}, ${ownerName}, false, ${body.voteChoice!}, ${status}, ${isOffline},
          ${reviewedBy}, ${status === 'verified' ? new Date().toISOString() : null}
        )
      `;
    }

    await sql`
      INSERT INTO audit_logs (actor, action, target_id, metadata)
      VALUES (${session.username}, 'household_vote_status_set', ${id}, ${JSON.stringify({ house_no: houseNo, voteStatus: body.voteStatus, voteChoice: body.voteChoice ?? null })})
    `;
  }

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata)
    VALUES (${session.username}, 'household_updated', ${id}, ${JSON.stringify({ house_no: houseNo })})
  `;

  return NextResponse.json({ success: true, household: updated[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await sql`SELECT id, house_no FROM households WHERE id = ${id} LIMIT 1`;
  if (!existing[0]) {
    return NextResponse.json({ error: 'ไม่พบบ้านเลขที่นี้' }, { status: 404 });
  }

  // Remove dependent records first to satisfy foreign keys
  await sql`
    DELETE FROM documents
    WHERE ballot_id IN (SELECT id FROM ballots WHERE household_id = ${id})
  `;
  await sql`DELETE FROM ballots WHERE household_id = ${id}`;
  await sql`DELETE FROM households WHERE id = ${id}`;

  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata)
    VALUES (${session.username}, 'household_deleted', ${id}, ${JSON.stringify({ house_no: existing[0].house_no })})
  `;

  return NextResponse.json({ success: true });
}
