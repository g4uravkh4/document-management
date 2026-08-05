const ACCESS_TOKEN_KEY = 'ca_firm_access_token';
const REFRESH_TOKEN_KEY = 'ca_firm_refresh_token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };
    if (typeof body.message === 'string') {
      message = body.message;
    } else if (Array.isArray(body.message) && body.message.length > 0) {
      message = body.message[0];
    } else if (body.error) {
      message = body.error;
    }
  } catch {
    // Ignore non-JSON error bodies.
  }
  return new ApiError(response.status, message);
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    clearTokens();
    return false;
  }
  const data = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  storeTokens(data.accessToken, data.refreshToken);
  return true;
}

let refreshInFlight: Promise<boolean> | null = null;

async function withAuth(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`/api${path}`, { ...init, headers });

  if (response.status === 401 && getRefreshToken()) {
    refreshInFlight ??= refreshTokens().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;

    if (refreshed) {
      const retryHeaders = new Headers(init.headers);
      if (!(init.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      const newToken = getAccessToken();
      if (newToken) {
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
      }
      return fetch(`/api${path}`, { ...init, headers: retryHeaders });
    }
  }

  return response;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await withAuth(path, init);
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  delete<T = void>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
  upload<T>(
    path: string,
    form: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<T> {
    if (onProgress) {
      return uploadWithProgress<T>(path, form, onProgress);
    }
    return request<T>(path, { method: 'POST', body: form });
  },
};

async function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  const headers = new Headers();
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api${path}`);
    accessToken && xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T);
        } catch {
          resolve(undefined as T);
        }
      } else {
        reject(
          new ApiError(xhr.status, safeErrorMessage(xhr.responseText)),
        );
      }
    });

    xhr.addEventListener('error', () => reject(new ApiError(0, 'Network error')));
    xhr.send(form);
  });
}

function safeErrorMessage(text: string): string {
  try {
    const body = JSON.parse(text) as { message?: string };
    return typeof body.message === 'string' ? body.message : 'Upload failed';
  } catch {
    return 'Upload failed';
  }
}

export async function downloadFile(
  path: string,
  fallbackName: string,
): Promise<void> {
  const headers = new Headers();
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const response = await fetch(`/api${path}`, { headers });
  if (!response.ok) {
    throw await parseError(response);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
