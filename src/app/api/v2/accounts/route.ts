import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type AccountRow = {
  slug: string;
  name: string;
  account_type: 'village' | 'school' | 'organization';
};

function isMissingTableError(error: unknown): boolean {
  return !!(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '42P01'
  );
}

export async function GET() {
  try {
    const rows = (await sql`
      SELECT slug, name, account_type
      FROM v2_accounts
      WHERE is_active = true
      ORDER BY name ASC
    `) as AccountRow[];

    return NextResponse.json({
      ok: true,
      accounts: rows,
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
        error: 'Unable to load accounts',
      },
      { status: 500 }
    );
  }
}
