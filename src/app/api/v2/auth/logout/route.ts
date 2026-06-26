import { NextResponse } from 'next/server';
import { V2_USER_COOKIE } from '@/lib/v2';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(V2_USER_COOKIE);
  return response;
}
