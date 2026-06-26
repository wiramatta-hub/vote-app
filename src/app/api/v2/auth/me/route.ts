import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getV2User, isMissingTableError } from '@/lib/v2';

export async function GET() {
  const session = await getV2User();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await sql`
      SELECT u.id, u.username, u.email, u.phone, u.display_name,
             a.id AS account_id, a.slug AS account_slug, a.name AS account_name,
             a.account_type
      FROM v2_users u
      JOIN v2_accounts a ON a.id = u.account_id
      WHERE u.id = ${session.userId}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      ok: true,
      user: {
        username: user.username,
        email: user.email,
        phone: user.phone,
        display_name: user.display_name,
      },
      account: {
        id: user.account_id,
        slug: user.account_slug,
        name: user.account_name,
        account_type: user.account_type,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'V2 schema not initialized' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 });
  }
}
