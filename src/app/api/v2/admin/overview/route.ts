import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2Admin, isMissingTableError } from '@/lib/v2';

type AccountRow = {
  id: string;
  slug: string;
  name: string;
  account_type: string;
  is_active: boolean;
};

type ElectionRow = {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type CandidateRow = {
  id: string;
  election_id: string;
  candidate_no: number;
  candidate_name: string;
  candidate_image_url: string | null;
  display_order: number;
  is_active: boolean;
};

export async function GET() {
  const admin = await getV2Admin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accounts = (await sql`
      SELECT id, slug, name, account_type, is_active
      FROM v2_accounts
      ORDER BY name ASC
    `) as AccountRow[];

    const elections = (await sql`
      SELECT id, account_id, title, description, is_active, starts_at, ends_at
      FROM v2_elections
      ORDER BY created_at DESC
    `) as ElectionRow[];

    const candidates = (await sql`
      SELECT id, election_id, candidate_no, candidate_name, candidate_image_url, display_order, is_active
      FROM v2_candidates
      ORDER BY display_order ASC, candidate_no ASC
    `) as CandidateRow[];

    const tree = accounts.map((account) => ({
      ...account,
      elections: elections
        .filter((e) => e.account_id === account.id)
        .map((e) => ({
          ...e,
          candidates: candidates.filter((c) => c.election_id === e.id),
        })),
    }));

    return NextResponse.json({ ok: true, accounts: tree });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { ok: false, error: 'V2 schema not initialized' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: 'Unable to load data' }, { status: 500 });
  }
}
