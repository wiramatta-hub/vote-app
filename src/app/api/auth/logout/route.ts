import { NextResponse } from 'next/server';
import { VOTER_COOKIE, ADMIN_COOKIE } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(VOTER_COOKIE);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
