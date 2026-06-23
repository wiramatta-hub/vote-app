import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { getSignedDownloadUrl } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const docs = await sql`
    SELECT file_path, file_name FROM documents WHERE id = ${id} LIMIT 1
  `;
  const doc = docs[0];

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = await getSignedDownloadUrl(doc.file_path, 120); // 2 minutes

  return NextResponse.json({ url, fileName: doc.file_name });
}
