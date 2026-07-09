import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, usersTable, loginEventsTable } from '@dropline/db';
import { desc, eq } from 'drizzle-orm';
import { signToken } from '../lib/jwt';
import { requireAuth, getAuth } from '../middleware/auth';
import { getClientIp } from '../lib/clientIp';
import { checkLoginRateLimit, isIpBlocked, recordLoginEvent } from '../lib/loginSecurity';
import { touchUserActivity } from '../lib/userActivity';
import { ensureTrial, grantPaidAllPlatforms } from '../lib/entitlement';
import {
  isEmailVerificationEnabled,
  isUserEmailVerified,
  sendEmailVerificationEmail,
  verifyEmailWithToken,
} from '../lib/emailVerification';
import {
  checkForgotPasswordRateLimit,
  resetPasswordWithToken,
  sendPasswordResetEmail,
} from '../lib/passwordReset';
import {
  consumeRegistrationCode,
  redeemAccessCodeForUser,
  resolveRegistrationCode,
} from '../lib/signupCodes';
import { deleteUserAndData, PROTECTED_ACCOUNT_EMAILS } from '../lib/deleteUser';
import { getAppUrl, isOpenRegistration } from '../lib/siteConfig';

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName, inviteCode } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
      inviteCode?: string;
    };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const codeRaw = inviteCode?.trim();
    let codeResolution: Awaited<ReturnType<typeof resolveRegistrationCode>> | null = null;

    if (codeRaw) {
      codeResolution = await resolveRegistrationCode(codeRaw);
      if (!codeResolution.ok) {
        res.status(400).json({ error: codeResolution.error });
        return;
      }
    } else if (!isOpenRegistration()) {
      res.status(400).json({ error: 'A sign-up code is required' });
      return;
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      const prior = existing[0];
      if (!prior.emailVerifiedAt && isEmailVerificationEnabled() && !prior.appleSub) {
        const sent = await sendEmailVerificationEmail({
          id: prior.id,
          email: prior.email,
          displayName: prior.displayName,
        });
        if (!sent) {
          res.status(503).json({ error: 'Could not send verification email. Please try again shortly.' });
          return;
        }
        res.json({
          ok: true,
          emailVerificationRequired: true,
          email: prior.email,
          message: 'We sent a confirmation link to your email. Please confirm before signing in.',
        });
        return;
      }
      res.status(400).json({ error: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const now = new Date();
    const verifyRequired = isEmailVerificationEnabled();
    const grantsFreeAccess = codeResolution?.ok === true ? codeResolution.grantsFreeAccess : false;

    try {
      await db.transaction(async tx => {
        await tx.insert(usersTable).values({
          id: userId,
          email: normalizedEmail,
          passwordHash,
          displayName: displayName?.trim() || null,
          isAdmin: false,
          isDisabled: false,
          tokenVersion: 0,
          emailVerifiedAt: verifyRequired ? null : now,
          lastActiveAt: now,
          createdAt: now,
          updatedAt: now,
        });
        if (codeResolution?.ok) {
          await consumeRegistrationCode(tx, codeResolution, userId, now);
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('CODE_ALREADY_USED')) {
        res.status(400).json({ error: 'This code has already been used' });
        return;
      }
      throw err;
    }

    await ensureTrial(userId, 'web');
    if (grantsFreeAccess) {
      await grantPaidAllPlatforms({ userId, source: 'admin_grant', externalId: `signup:${codeRaw}` });
    }

    if (verifyRequired) {
      const sent = await sendEmailVerificationEmail({
        id: userId,
        email: normalizedEmail,
        displayName: displayName?.trim() || null,
      });
      if (!sent) {
        res.status(503).json({ error: 'Could not send verification email. Please try again shortly.' });
        return;
      }
      res.json({
        ok: true,
        emailVerificationRequired: true,
        email: normalizedEmail,
        message: 'We sent a confirmation link to your email. Please confirm before signing in.',
      });
      return;
    }

    const ip = getClientIp(req);
    await recordLoginEvent(userId, normalizedEmail, ip, true);
    const token = signToken({ userId, email: normalizedEmail, tokenVersion: 0 }, true);
    res.status(201).json({
      token,
      user: {
        userId,
        email: normalizedEmail,
        displayName: displayName?.trim() || null,
        isAdmin: false,
      },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const ip = getClientIp(req);

    if (await isIpBlocked(ip)) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const rateLimit = await checkLoginRateLimit(normalized, ip);
    if (rateLimit.blocked) {
      res.status(429).json({
        error: 'Too many failed sign-in attempts. Try again later or contact support.',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      return;
    }

    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
    const user = rows[0];
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      await recordLoginEvent(user?.id ?? null, normalized, ip, false);
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    if (user.isDisabled || user.accessRevokedAt) {
      await recordLoginEvent(user.id, normalized, ip, false);
      res.status(403).json({ error: 'Account is disabled.' });
      return;
    }

    if (!isUserEmailVerified(user)) {
      res.status(403).json({
        error: 'Please confirm your email before signing in. Check your inbox for the verification link.',
        emailNotVerified: true,
        email: user.email,
      });
      return;
    }

    await recordLoginEvent(user.id, normalized, ip, true);
    await touchUserActivity(user.id);
    await ensureTrial(user.id, 'web');

    const token = signToken(
      { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
      rememberMe !== false,
    );
    res.json({
      token,
      user: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auth/me', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    void touchUserActivity(auth.userId);
    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isAdmin: usersTable.isAdmin,
        isDisabled: usersTable.isDisabled,
        appleSub: usersTable.appleSub,
        emailVerifiedAt: usersTable.emailVerifiedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId))
      .limit(1);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      hasPassword: true,
      isAppleOnly: !!user.appleSub && !user.email.includes('@'),
      emailVerified: isUserEmailVerified(user),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auth/verify-email', async (req, res) => {
  const token = String(req.query.token ?? '').trim();
  const appUrl = getAppUrl();
  if (!token) {
    res.redirect(`${appUrl}/verify-email?error=missing`);
    return;
  }
  try {
    const result = await verifyEmailWithToken(token);
    if (!result.ok) {
      res.redirect(`${appUrl}/verify-email?error=${encodeURIComponent(result.error)}`);
      return;
    }
    res.redirect(`${appUrl}/sign-in?verified=success`);
  } catch {
    res.redirect(`${appUrl}/verify-email?error=${encodeURIComponent('Could not verify email. Please try again.')}`);
  }
});

router.post('/auth/verify-email', async (req, res) => {
  const token = String((req.body as { token?: string }).token ?? '').trim();
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }
  try {
    const result = await verifyEmailWithToken(token);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true, email: result.email });
  } catch {
    res.status(500).json({ error: 'Could not verify email. Please try again.' });
  }
});

router.post('/auth/resend-verification', async (req, res) => {
  const { email } = req.body as { email?: string };
  const generic = {
    ok: true,
    message: 'If that email is registered and not yet confirmed, a verification link is on its way.',
  };
  if (!email?.trim()) {
    res.json(generic);
    return;
  }
  const ip = getClientIp(req);
  const normalizedEmail = email.toLowerCase().trim();
  const ipLimit = checkForgotPasswordRateLimit(`ip:${ip}`);
  if (ipLimit.blocked) {
    res.set('Retry-After', String(ipLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter: ipLimit.retryAfterSeconds });
    return;
  }
  const emailLimit = checkForgotPasswordRateLimit(`verify:${normalizedEmail}`);
  if (emailLimit.blocked) {
    res.set('Retry-After', String(emailLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter: emailLimit.retryAfterSeconds });
    return;
  }
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (rows.length > 0 && !rows[0].emailVerifiedAt && !rows[0].appleSub && isEmailVerificationEnabled()) {
      await sendEmailVerificationEmail({
        id: rows[0].id,
        email: rows[0].email,
        displayName: rows[0].displayName,
      });
    }
  } catch {
    // never reveal whether the email exists
  }
  res.json(generic);
});

router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body as { email?: string };
  const generic = { ok: true, message: 'If that email is registered, a reset link is on its way.' };
  if (!email?.trim()) {
    res.json(generic);
    return;
  }
  const ip = getClientIp(req);
  const normalizedEmail = email.toLowerCase().trim();
  const ipLimit = checkForgotPasswordRateLimit(`ip:${ip}`);
  if (ipLimit.blocked) {
    res.set('Retry-After', String(ipLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter: ipLimit.retryAfterSeconds });
    return;
  }
  const emailLimit = checkForgotPasswordRateLimit(`email:${normalizedEmail}`);
  if (emailLimit.blocked) {
    res.set('Retry-After', String(emailLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter: emailLimit.retryAfterSeconds });
    return;
  }

  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
    if (rows[0]?.passwordHash) {
      const result = await sendPasswordResetEmail({
        id: rows[0].id,
        email: rows[0].email,
        displayName: rows[0].displayName,
      });
      if (!result.sent && result.resetUrl) {
        res.json({ ...generic, resetUrl: result.resetUrl });
        return;
      }
    }
  } catch {
    // never reveal
  }
  res.json(generic);
});

router.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token?.trim() || !newPassword) {
    res.status(400).json({ error: 'token and newPassword are required' });
    return;
  }
  const result = await resetPasswordWithToken(token, newPassword);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ ok: true });
});

router.post('/auth/change-password', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'Current password and a new password (8+ characters) are required' });
      return;
    }
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    const user = rows[0];
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(usersTable)
      .set({
        passwordHash,
        tokenVersion: user.tokenVersion + 1,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id));
    const token = signToken(
      { userId: user.id, email: user.email, tokenVersion: user.tokenVersion + 1 },
      true,
    );
    res.json({ ok: true, token });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/change-email', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { currentPassword, newEmail } = req.body as {
      currentPassword?: string;
      newEmail?: string;
    };
    const normalized = newEmail?.toLowerCase().trim();
    if (!currentPassword || !normalized) {
      res.status(400).json({ error: 'Current password and new email are required' });
      return;
    }
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    const user = rows[0];
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const clash = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
    if (clash[0] && clash[0].id !== user.id) {
      res.status(400).json({ error: 'That email is already in use' });
      return;
    }
    const now = new Date();
    const verifyRequired = isEmailVerificationEnabled();
    await db
      .update(usersTable)
      .set({
        email: normalized,
        emailVerifiedAt: verifyRequired ? null : now,
        tokenVersion: user.tokenVersion + 1,
        updatedAt: now,
      })
      .where(eq(usersTable.id, user.id));

    if (verifyRequired) {
      await sendEmailVerificationEmail({
        id: user.id,
        email: normalized,
        displayName: user.displayName,
      });
      res.json({
        ok: true,
        email: normalized,
        emailVerificationRequired: true,
        message: 'Email updated. Please confirm the new address before signing in again.',
      });
      return;
    }

    const token = signToken(
      { userId: user.id, email: normalized, tokenVersion: user.tokenVersion + 1 },
      true,
    );
    res.json({ ok: true, email: normalized, token });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/delete-account', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { password, emailConfirmation } = req.body as {
      password?: string;
      emailConfirmation?: string;
    };
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (PROTECTED_ACCOUNT_EMAILS.has(user.email.toLowerCase())) {
      res.status(403).json({ error: 'This demo account cannot be deleted.' });
      return;
    }

    const confirmEmail = (emailConfirmation ?? '').toLowerCase().trim();
    if (confirmEmail !== user.email.toLowerCase()) {
      res.status(400).json({ error: 'Type your email address to confirm account deletion.' });
      return;
    }

    if (user.passwordHash) {
      if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'Password is incorrect' });
        return;
      }
    }
    // SIWA-only accounts: typed email + active session is sufficient

    await deleteUserAndData(user.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/redeem-access-code', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { code } = req.body as { code?: string };
    const result = await redeemAccessCodeForUser(auth.userId, code ?? '');
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auth/login-events', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const events = await db
      .select({
        id: loginEventsTable.id,
        emailAttempted: loginEventsTable.emailAttempted,
        ipAddress: loginEventsTable.ipAddress,
        succeeded: loginEventsTable.succeeded,
        createdAt: loginEventsTable.createdAt,
      })
      .from(loginEventsTable)
      .where(eq(loginEventsTable.userId, auth.userId))
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(20);
    res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
