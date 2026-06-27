import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type AccountRow = {
  id: string;
  slug: string;
  name: string;
  account_type: 'village' | 'school' | 'organization';
};

type ElectionRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

type CandidateRow = {
  id: string;
  candidate_no: number;
  candidate_name: string;
  candidate_image_url: string | null;
};

function isMissingTableError(error: unknown): boolean {
  return !!(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '42P01'
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const accountRows = (await sql`
      SELECT id, slug, name, account_type
      FROM v2_accounts
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    `) as AccountRow[];

    const account = accountRows[0];
    if (!account) {
      return NextResponse.json({ ok: false, error: 'Account not found' }, { status: 404 });
    }

    const electionRows = (await sql`
      SELECT id, title, description, starts_at, ends_at
      FROM v2_elections
      WHERE account_id = ${account.id} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `) as ElectionRow[];

    const election = electionRows[0] ?? null;

    const candidates = election
      ? ((await sql`
          SELECT id, candidate_no, candidate_name, candidate_image_url
          FROM v2_candidates
          WHERE election_id = ${election.id} AND is_active = true
          ORDER BY display_order ASC, candidate_no ASC
        `) as CandidateRow[])
      : [];

    return NextResponse.json({
      ok: true,
      account,
      election,
      candidates,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'V2 schema not initialized',
          hint: 'Run supabase/v2_schema.sql in your database first',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to load account details',
      },
      { status: 500 }
    );
  }
}
