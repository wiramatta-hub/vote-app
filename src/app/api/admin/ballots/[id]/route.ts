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
  const body = await req.json();
  const voterName = String(body.voter_name ?? '').trim();
  const proxyName = String(body.proxy_name ?? '').trim();
  const isProxy = body.is_proxy === true || body.is_proxy === 'true';

  if (!voterName) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ลงมติ' }, { status: 400 });
  }
  if (isProxy && !proxyName) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อผู้รับมอบฉันทะ' }, { status: 400 });
  }

  const [updated] = await sql`
    UPDATE ballots
    SET voter_name = ${voterName},
        is_proxy = ${isProxy},
        proxy_name = ${isProxy ? proxyName : null}
    WHERE id = ${id}
    RETURNING id, voter_name, is_proxy, proxy_name
  `;

  if (!updated) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 });

  await sql`
    INSERT INTO audit_logs (actor, action, target_id)
    VALUES (${session.username}, 'ballot_name_edited', ${id})
  `;

  return NextResponse.json({ success: true, ...updated });
}
