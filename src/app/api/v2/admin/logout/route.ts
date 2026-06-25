import { NextResponse } from 'next/server';
import { V2_ADMIN_COOKIE } from '@/lib/v2';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(V2_ADMIN_COOKIE);
  return response;
}
