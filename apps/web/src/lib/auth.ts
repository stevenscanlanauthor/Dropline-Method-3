export interface AuthUser {
  userId: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  emailVerified?: boolean;
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

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    super(`Too many attempts — try again in ${minutes} minute${minutes !== 1 ? 's' : ''}`);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class EmailNotVerifiedError extends Error {
  email: string;
  constructor(email: string, message: string) {
    super(message);
    this.name = 'EmailNotVerifiedError';
    this.email = email;
  }
}

export class EmailVerificationRequiredError extends Error {
  email: string;
  constructor(email: string, message: string) {
    super(message);
    this.name = 'EmailVerificationRequiredError';
    this.email = email;
  }
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

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}). The API may not be deployed yet.`);
    }
    throw new Error('Account service returned an empty response. The API may not be deployed yet — check Render service "dropline" is Live.');
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Account service returned an invalid response. The site API may not be live yet.');
  }
}

export async function apiLogin(email: string, password: string, rememberMe = true): Promise<AuthUser> {
  const res = await apiFetch(apiUrl('/auth/login'), {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
  const data = await parseJsonResponse(res);
  if (res.status === 429) throw new RateLimitError(Number(data.retryAfterSeconds ?? data.retryAfter ?? 60));
  if (res.status === 403 && data.emailNotVerified) {
    throw new EmailNotVerifiedError(
      String(data.email ?? email),
      String(data.error || 'Please confirm your email before signing in.'),
    );
  }
  if (!res.ok) throw new Error(String(data.error || 'Sign in failed'));
  storeAuthToken(String(data.token));
  return data.user as AuthUser;
}

export async function apiRegister(
  email: string,
  password: string,
  displayName?: string,
  inviteCode?: string,
): Promise<AuthUser> {
  const body: Record<string, string> = { email, password };
  if (displayName?.trim()) body.displayName = displayName.trim();
  if (inviteCode?.trim()) body.inviteCode = inviteCode.trim();
  const res = await apiFetch(apiUrl('/auth/register'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Registration failed'));
  if (data.emailVerificationRequired) {
    throw new EmailVerificationRequiredError(
      String(data.email ?? email),
      String(data.message || 'We sent a confirmation link to your email. Please confirm before signing in.'),
    );
  }
  storeAuthToken(String(data.token));
  return data.user as AuthUser;
}

export async function apiMe(): Promise<AuthUser | null> {
  const res = await apiFetch(apiUrl('/auth/me'));
  if (res.status === 401) return null;
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Could not load session'));
  return data as AuthUser;
}

export async function apiSignOut(): Promise<void> {
  clearStoredAuthToken();
}

export async function apiForgotPassword(email: string): Promise<{ resetUrl?: string }> {
  const res = await apiFetch(apiUrl('/auth/forgot-password'), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  const data = await parseJsonResponse(res);
  return { resetUrl: data.resetUrl as string | undefined };
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  const res = await apiFetch(apiUrl('/auth/reset-password'), {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to reset password'));
}

export async function apiVerifyEmail(token: string): Promise<{ email: string }> {
  const res = await apiFetch(apiUrl('/auth/verify-email'), {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to verify email'));
  return { email: String(data.email) };
}

export async function apiResendVerification(email: string): Promise<void> {
  const res = await apiFetch(apiUrl('/auth/resend-verification'), {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to resend verification email'));
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch(apiUrl('/auth/change-password'), {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to change password'));
  if (data.token) storeAuthToken(String(data.token));
}

export async function apiChangeEmail(currentPassword: string, newEmail: string): Promise<{ email: string; emailVerificationRequired?: boolean }> {
  const res = await apiFetch(apiUrl('/auth/change-email'), {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newEmail }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to change email'));
  if (data.token) storeAuthToken(String(data.token));
  return {
    email: String(data.email),
    emailVerificationRequired: !!data.emailVerificationRequired,
  };
}

export async function apiDeleteAccount(opts: { password?: string; emailConfirmation: string }): Promise<void> {
  const res = await apiFetch(apiUrl('/auth/delete-account'), {
    method: 'POST',
    body: JSON.stringify(opts),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to delete account'));
  clearStoredAuthToken();
}

export async function apiLoginEvents(): Promise<Array<{
  id: string;
  emailAttempted: string;
  ipAddress: string;
  succeeded: boolean;
  createdAt: string;
}>> {
  const res = await apiFetch(apiUrl('/auth/login-events'));
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Failed to load login history'));
  return data;
}

export async function apiBillingPublic(): Promise<{
  trialDays: number;
  macProductId: string;
  iosProductId: string;
  macPriceDisplay: string;
  iosPriceDisplay: string;
}> {
  const res = await apiFetch(apiUrl('/billing/public'));
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error || 'Failed to load billing info'));
  return data;
}

export async function apiRedeemAccessCode(code: string): Promise<void> {
  const res = await apiFetch(apiUrl('/billing/redeem-code'), {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(String(data.error || 'Failed to redeem code'));
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
