import type {SessionUser} from '@/api/types';
import {config} from './config';

export function encodeSession(user: SessionUser) {
  return encodeURIComponent(JSON.stringify(user));
}

export function decodeSession(value: string | undefined | null): SessionUser | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as SessionUser;
    if (!parsed?.id || !parsed.email || !parsed.role) {
      return null;
    }
    return {
      ...parsed,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : undefined,
    };
  } catch {
    return null;
  }
}

export function writeSessionCookie(user: SessionUser) {
  document.cookie = `${config.sessionCookie}=${encodeSession(user)}; path=/; SameSite=Lax`;
}

export function writeApiTokenCookie(token: string) {
  document.cookie = `${config.apiTokenCookie}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

export function getApiToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${config.apiTokenCookie}=`;
  const match = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  if (!match) {
    return null;
  }
  const value = match.slice(prefix.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function clearSessionCookie() {
  document.cookie = `${config.sessionCookie}=; path=/; max-age=0`;
  document.cookie = `${config.apiTokenCookie}=; path=/; max-age=0`;
}
