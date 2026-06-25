import { cookies } from 'next/headers';
import { signToken, verifyToken } from './session';

export const V2_ADMIN_COOKIE = 'v2_admin_session';

export interface V2AdminSession {
  scope: 'v2admin';
}

export async function signV2AdminToken(): Promise<string> {
  return signToken({ scope: 'v2admin' }, '8h');
}

export async function getV2Admin(): Promise<V2AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(V2_ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<V2AdminSession>(token);
  if (!payload || payload.scope !== 'v2admin') return null;
  return payload;
}

export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isMissingTableError(error: unknown): boolean {
  return !!(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '42P01'
  );
}
