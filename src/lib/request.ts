import {ApiError} from '@/api/errors';
import {config} from '@/lib/config';
import {getApiToken} from '@/lib/session';

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return `API ${res.status}`;
  }
  try {
    const parsed = JSON.parse(text) as {message?: string; errors?: Array<{message?: string}>};
    const fieldMsg = parsed.errors?.find(e => e.message)?.message;
    return fieldMsg ?? parsed.message ?? text;
  } catch {
    return text;
  }
}

/**
 * All admin API calls hit halacoach-apis under NEXT_PUBLIC_API_BASE_URL
 * (e.g. http://localhost:3333/api/admin) + path (/v1/...).
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  if (!base) {
    throw new ApiError(
      503,
      'API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.',
    );
  }

  const token = getApiToken();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function requestBlob(path: string): Promise<Blob> {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  if (!base) {
    throw new ApiError(
      503,
      'API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local.',
    );
  }

  const token = getApiToken();
  const res = await fetch(`${base}${path}`, {
    headers: {
      Accept: '*/*',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  const contentType = (res.headers.get('content-type') || 'application/octet-stream')
    .split(';')[0]
    .trim();
  const buffer = await res.arrayBuffer();
  return new Blob([buffer], {type: contentType});
}
