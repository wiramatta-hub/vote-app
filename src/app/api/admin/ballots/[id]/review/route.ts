import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action, reason } = (await req.json()) as { action: string; reason?: string };

  if (!['verify', 'verify_other', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (action === 'reject' && !reason?.trim()) {
    return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ปฏิเสธ' }, { status: 400 });
  }
  if (action === 'verify_other' && !reason?.trim()) {
    return NextResponse.json({ error: 'กรุณาระบุเหตุผล/วิธีการตรวจสอบเอกสาร' }, { status: 400 });
  }

  const newStatus = action === 'reject' ? 'rejected' : 'verified';
  const rejectReason = action === 'reject' ? reason!.trim() : null;
  const verifyNote = action === 'verify_other' ? reason!.trim() : null;

  await sql`
    UPDATE ballots
    SET status = ${newStatus},
        reject_reason = ${rejectReason},
        verify_note = ${verifyNote},
        reviewed_by = ${session.username},
        reviewed_at = now()
    WHERE id = ${id}
  `;

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');
  await sql`
    INSERT INTO audit_logs (actor, action, target_id, metadata, ip_address)
    VALUES (
      ${session.username},
      ${'ballot_' + action},
      ${id},
      ${action === 'reject' || action === 'verify_other' ? JSON.stringify({ reason }) : null},
      ${ip}
    )
  `;

  return NextResponse.json({ success: true });
}
