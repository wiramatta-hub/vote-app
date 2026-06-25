import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    scope: 'v2',
    message: 'Multi-user API namespace is ready',
    timestamp: new Date().toISOString(),
  });
}
