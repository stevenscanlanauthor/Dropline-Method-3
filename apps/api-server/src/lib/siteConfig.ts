export function getAppUrl(): string {
  const raw = process.env.APP_URL?.trim() || 'https://www.droplinemethod.com';
  return raw.replace(/\/+$/, '');
}

export function getFromEmail(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}

export function isEmailVerificationEnabled(): boolean {
  const raw = process.env.REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return true;
}

export function isOpenRegistration(): boolean {
  const raw = process.env.OPEN_REGISTRATION?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return true;
}
