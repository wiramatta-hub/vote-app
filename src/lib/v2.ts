import { cookies } from 'next/headers';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { signToken, verifyToken } from './session';

const scryptAsync = promisify(scrypt);

export const V2_ADMIN_COOKIE = 'v2_admin_session';
export const V2_USER_COOKIE = 'v2_user_session';

export interface V2AdminSession {
  scope: 'v2admin';
}

export interface V2UserSession {
  scope: 'v2user';
  userId: string;
  accountId: string;
  accountSlug: string;
  username: string;
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

export async function signV2UserToken(
  payload: Omit<V2UserSession, 'scope'>
): Promise<string> {
  return signToken({ scope: 'v2user', ...payload }, '7d');
}

export async function getV2User(): Promise<V2UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(V2_USER_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<V2UserSession>(token);
  if (!payload || payload.scope !== 'v2user') return null;
  return payload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuf = Buffer.from(key, 'hex');
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
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
