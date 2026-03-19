import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const YOUTUBE_SESSION_COOKIE = 'fancut_youtube_session';
export const YOUTUBE_OAUTH_STATE_COOKIE = 'fancut_youtube_oauth_state';

export type CookieConfig = {
  secure: boolean;
};

function getSessionSecret() {
  const secret = process.env.SOCIAL_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error('SOCIAL_SESSION_SECRET이 설정되지 않았습니다. 루트 .env.local에 SOCIAL_SESSION_SECRET=... 을 추가하세요.');
  }
  return secret;
}

function keyForSecret(secret: string) {
  return createHash('sha256').update(secret).digest();
}

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export function sealCookieValue<T>(payload: T) {
  const secret = getSessionSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyForSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${toBase64Url(iv)}.${toBase64Url(authTag)}.${toBase64Url(encrypted)}`;
}

export function unsealCookieValue<T>(value?: string) {
  if (!value) return null;
  try {
    const [ivPart, tagPart, encryptedPart] = value.split('.');
    if (!ivPart || !tagPart || !encryptedPart) return null;
    const secret = getSessionSecret();
    const decipher = createDecipheriv('aes-256-gcm', keyForSecret(secret), fromBase64Url(ivPart));
    decipher.setAuthTag(fromBase64Url(tagPart));
    const decrypted = Buffer.concat([decipher.update(fromBase64Url(encryptedPart)), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function baseCookieOptions(config: CookieConfig) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.secure,
    path: '/',
  };
}
