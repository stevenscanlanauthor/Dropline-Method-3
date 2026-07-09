import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db, emailVerificationTokensTable, usersTable } from '@dropline/db';
import { getAppUrl, getFromEmail, isEmailVerificationEnabled } from './siteConfig';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const VERIFIED_BY_DEFAULT_EMAILS = new Set([
  'apple-review@droplinemethod.com',
  'apple-review-expired@droplinemethod.com',
]);

export { isEmailVerificationEnabled };

export function isUserEmailVerified(user: {
  email: string;
  emailVerifiedAt: Date | null;
  appleSub?: string | null;
}): boolean {
  if (!isEmailVerificationEnabled()) return true;
  if (user.emailVerifiedAt) return true;
  if (user.appleSub) return true;
  if (VERIFIED_BY_DEFAULT_EMAILS.has(user.email.toLowerCase())) return true;
  return false;
}

function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export async function ensureEmailVerificationSchema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      note TEXT,
      grants_billing_exempt BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      used_at TIMESTAMP,
      used_by_user_id TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS access_codes (
      code TEXT PRIMARY KEY,
      note TEXT,
      max_redemptions INTEGER NOT NULL DEFAULT 1,
      redemption_count INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS access_code_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL REFERENCES access_codes(code) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (code, user_id)
    )
  `);
}

export async function backfillEmailVerifiedAt(): Promise<void> {
  try {
    await db
      .update(usersTable)
      .set({ emailVerifiedAt: sql`COALESCE(${usersTable.emailVerifiedAt}, ${usersTable.createdAt})` })
      .where(isNull(usersTable.emailVerifiedAt));
  } catch (err) {
    console.warn('[emailVerification] backfill failed (non-fatal)', err);
  }
}

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS);

  await db
    .update(emailVerificationTokensTable)
    .set({ usedAt: now })
    .where(and(eq(emailVerificationTokensTable.userId, userId), isNull(emailVerificationTokensTable.usedAt)));

  await db.insert(emailVerificationTokensTable).values({
    id: uuidv4(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  return plainToken;
}

export async function sendEmailVerificationEmail(user: {
  id: string;
  email: string;
  displayName: string | null;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn('[emailVerification] RESEND_API_KEY not set');
    return false;
  }

  const plainToken = await issueEmailVerificationToken(user.id);
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${plainToken}`;
  const fromEmail = getFromEmail() ?? 'noreply@droplinemethod.com';
  const name = user.displayName || user.email;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `Dropline <${fromEmail}>`,
      to: user.email,
      subject: 'Confirm your Dropline email',
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f4ef;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e0d8;">
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1a1a1a;font-family:Georgia,serif;">Dropline</p>
        <hr style="border:none;border-top:1px solid #e5e0d8;margin:20px 0;">
        <p style="font-size:15px;color:#1a1a1a;margin:0 0 10px;">Hi ${name},</p>
        <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
          Thanks for signing up. Please confirm your email address to activate your account.
          This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#1f4b3a;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">
          Confirm my email
        </a>
        <p style="font-size:13px;color:#888;margin:24px 0 0;">If you didn't create a Dropline account, you can ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;background:#f7f4ef;border-top:1px solid #e5e0d8;">
        <p style="margin:0;font-size:12px;color:#aaa;">Or copy this link:<br><span style="color:#666;word-break:break-all;">${verifyUrl}</span></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
      text: `Dropline — Confirm your email\n\nHi ${name},\n\nOpen this link to confirm your email (expires in 24 hours):\n\n${verifyUrl}\n`,
    });
    return true;
  } catch (err) {
    console.warn('[emailVerification] send failed', err);
    return false;
  }
}

export async function verifyEmailWithToken(
  plainToken: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const tokenHash = hashToken(plainToken.trim());
  const now = new Date();

  const rows = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(and(eq(emailVerificationTokensTable.tokenHash, tokenHash), isNull(emailVerificationTokensTable.usedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { ok: false, error: 'This verification link is invalid or has already been used.' };
  }
  if (row.expiresAt < now) {
    return { ok: false, error: 'This verification link has expired. Request a new one from the sign-in page.' };
  }

  const users = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, row.userId))
    .limit(1);

  const user = users[0];
  if (!user) {
    return { ok: false, error: 'Account not found.' };
  }

  await db.transaction(async tx => {
    await tx
      .update(usersTable)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(usersTable.id, user.id));
    await tx
      .update(emailVerificationTokensTable)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokensTable.id, row.id));
  });

  return { ok: true, email: user.email };
}
