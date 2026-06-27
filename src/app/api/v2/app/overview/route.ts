import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2User, isMissingTableError } from '@/lib/v2';

export async function GET() {
  const session = await getV2User();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accountRows = await sql`
      SELECT id, slug, name, account_type, is_active
      FROM v2_accounts WHERE id = ${session.accountId} LIMIT 1
    `;
    const account = accountRows[0];
    if (!account) return NextResponse.json({ error: 'ไม่พบบัญชี' }, { status: 404 });

    const elections = await sql`
      SELECT id, title, description, is_active, starts_at, ends_at
      FROM v2_elections WHERE account_id = ${session.accountId}
      ORDER BY created_at DESC
    `;

    const candidates = await sql`
      SELECT c.id, c.election_id, c.candidate_no, c.candidate_name, c.candidate_image_url, c.display_order, c.is_active
      FROM v2_candidates c
      JOIN v2_elections e ON e.id = c.election_id
      WHERE e.account_id = ${session.accountId}
      ORDER BY c.display_order ASC, c.candidate_no ASC
    `;

    const tree = elections.map((e) => ({
      ...e,
      candidates: candidates.filter((c) => c.election_id === e.id),
    }));

    return NextResponse.json({ ok: true, account, elections: tree });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'V2 schema not initialized' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Unable to load data' }, { status: 500 });
  }
}
