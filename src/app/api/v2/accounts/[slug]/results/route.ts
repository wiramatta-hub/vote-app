import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isMissingTableError } from '@/lib/v2';

type CandidateResult = {
  id: string;
  candidate_no: number;
  candidate_name: string;
  votes: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const accountRows = await sql`
      SELECT id, name FROM v2_accounts WHERE slug = ${slug} AND is_active = true LIMIT 1
    `;
    const account = accountRows[0];
    if (!account) {
      return NextResponse.json({ ok: false, error: 'ไม่พบบัญชี' }, { status: 404 });
    }

    const electionRows = await sql`
      SELECT id, title, description, starts_at, ends_at
      FROM v2_elections
      WHERE account_id = ${account.id} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const election = electionRows[0] ?? null;

    if (!election) {
      return NextResponse.json({
        ok: true,
        account: { name: account.name },
        election: null,
        totalVotes: 0,
        results: [],
      });
    }

    const rows = (await sql`
      SELECT c.id, c.candidate_no, c.candidate_name,
             COUNT(b.id)::int AS votes
      FROM v2_candidates c
      LEFT JOIN v2_ballots b ON b.candidate_id = c.id
      WHERE c.election_id = ${election.id} AND c.is_active = true
      GROUP BY c.id, c.candidate_no, c.candidate_name
      ORDER BY c.display_order ASC, c.candidate_no ASC
    `) as CandidateResult[];

    const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);

    return NextResponse.json({
      ok: true,
      account: { name: account.name },
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        starts_at: election.starts_at,
        ends_at: election.ends_at,
      },
      totalVotes,
      results: rows,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { ok: false, error: 'V2 schema not initialized' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: 'ไม่สามารถโหลดผลคะแนนได้' }, { status: 500 });
  }
}
