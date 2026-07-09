import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db, passwordResetTokensTable, usersTable } from '@dropline/db';
import { getAppUrl, getFromEmail } from './siteConfig';

const RESET_TTL_MS = 15 * 60 * 1000;

const forgotBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkForgotPasswordRateLimit(key: string): {
  blocked: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 5;
  const entry = forgotBuckets.get(key);
  if (!entry || entry.resetAt < now) {
    forgotBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false };
  }
  if (entry.count >= max) {
    return { blocked: true, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { blocked: false };
}

function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export async function sendPasswordResetEmail(user: {
  id: string;
  email: string;
  displayName: string | null;
}): Promise<{ sent: boolean; resetUrl?: string }> {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokensTable.userId, user.id), isNull(passwordResetTokensTable.usedAt)));

  await db.insert(passwordResetTokensTable).values({
    id: uuidv4(),
    userId: user.id,
    tokenHash,
    expiresAt,
    createdAt: now,
  });

  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${plainToken}`;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn('[passwordReset] RESEND_API_KEY not set — returning reset URL for dev');
    return { sent: false, resetUrl };
  }

  const fromEmail = getFromEmail() ?? 'noreply@droplinemethod.com';
  const name = user.displayName || user.email;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `Dropline <${fromEmail}>`,
      to: user.email,
      subject: 'Reset your Dropline password',
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f4ef;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
    <table width="480" style="background:#fff;border-radius:12px;border:1px solid #e5e0d8;">
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 4px;font-size:22px;font-weight:700;font-family:Georgia,serif;">Dropline</p>
        <hr style="border:none;border-top:1px solid #e5e0d8;margin:20px 0;">
        <p style="font-size:15px;margin:0 0 10px;">Hi ${name},</p>
        <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
          We received a request to reset your password. This link expires in <strong>15 minutes</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#1f4b3a;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">
          Reset password
        </a>
        <p style="font-size:13px;color:#888;margin:24px 0 0;">If you didn't request this, you can ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
      text: `Dropline — Reset password\n\n${resetUrl}\n\nExpires in 15 minutes.`,
    });
    return { sent: true };
  } catch (err) {
    console.warn('[passwordReset] send failed', err);
    return { sent: false, resetUrl };
  }
}

export async function resetPasswordWithToken(
  plainToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  const tokenHash = hashToken(plainToken.trim());
  const now = new Date();
  const rows = await db
    .select()
    .from(passwordResetTokensTable)
    .where(and(eq(passwordResetTokensTable.tokenHash, tokenHash), isNull(passwordResetTokensTable.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: 'This reset link is invalid or has already been used.' };
  if (row.expiresAt < now) return { ok: false, error: 'This reset link has expired. Request a new one.' };

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.transaction(async tx => {
    await tx
      .update(usersTable)
      .set({
        passwordHash,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(usersTable.id, row.userId));
    await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: now })
      .where(eq(passwordResetTokensTable.id, row.id));
  });
  return { ok: true };
}
