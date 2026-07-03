export interface AuthUser {
  userId: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

const TOKEN_KEY = 'dropline_auth_token';

function apiBase(): string {
  const env = import.meta.env.VITE_API_URL?.trim();
  if (env) return env.replace(/\/+$/, '');
  return '';
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${normalized}` : `/api${normalized}`;
}

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers, credentials: 'include' });
}

export async function apiLogin(email: string, password: string, rememberMe = true): Promise<AuthUser> {
  const res = await apiFetch(apiUrl('/auth/login'), {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Sign in failed'));
  storeAuthToken(data.token);
  return data.user as AuthUser;
}

export async function apiRegister(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthUser> {
  const res = await apiFetch(apiUrl('/auth/register'), {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Registration failed'));
  storeAuthToken(data.token);
  return data.user as AuthUser;
}

export async function apiMe(): Promise<AuthUser | null> {
  const res = await apiFetch(apiUrl('/auth/me'));
  if (res.status === 401) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Could not load session'));
  return data as AuthUser;
}

export async function apiSignOut(): Promise<void> {
  clearStoredAuthToken();
}

export type EntitlementStatus = {
  platform: 'web' | 'ios' | 'macos';
  status: 'trial' | 'paid' | 'expired' | 'none' | 'revoked';
  trialDaysRemaining: number | null;
  trialExpiresAt: string | null;
  paidAt: string | null;
};

export type BillingStatus = {
  entitlement: EntitlementStatus;
  canWrite: boolean;
};

export async function apiBillingStatus(): Promise<BillingStatus> {
  const res = await apiFetch(apiUrl('/billing/status'));
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Failed to load billing'));
  return data as BillingStatus;
}

export async function apiIapVerify(jws: string): Promise<{ paid: boolean; entitlement: EntitlementStatus }> {
  const res = await apiFetch(apiUrl('/iap/verify'), {
    method: 'POST',
    headers: { 'X-Platform': 'macos' },
    body: JSON.stringify({ jws }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.message || data.error || 'Verification failed'));
  return data;
}

export async function apiAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(apiUrl(path), init);
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Request failed'));
  return data as T;
}
