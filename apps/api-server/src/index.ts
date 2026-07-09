import { createApp } from './app';
import { ensureInitialAdmin } from './bootstrap';
import { ensureUserActivityColumn } from './lib/userActivity';
import {
  backfillEmailVerifiedAt,
  ensureEmailVerificationSchema,
} from './lib/emailVerification';
import {
  ensureAppleReviewAccount,
  ensureAppleReviewExpiredAccount,
  ensureAppleReviewInviteCode,
} from './lib/reviewAccounts';

const port = Number(process.env.PORT ?? 3001);

function envPresent(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function logEnvDiagnostics() {
  const keys = [
    'DATABASE_URL',
    'JWT_SECRET',
    'APP_URL',
    'CORS_ORIGIN',
    'WEB_DIST_PATH',
    'RESEND_API_KEY',
    'ADMIN_INITIAL_EMAIL',
    'APPLE_REVIEW_PASSWORD',
    'APPLE_REVIEW_EXPIRED_PASSWORD',
  ];
  console.log(
    '[startup] env present:',
    keys.map(k => `${k}=${envPresent(k) ? 'yes' : 'NO'}`).join(' '),
  );
  console.log('[startup] cwd=', process.cwd(), 'PORT=', process.env.PORT ?? '(unset)');
}

async function main() {
  logEnvDiagnostics();

  if (!envPresent('DATABASE_URL')) {
    throw new Error(
      'DATABASE_URL is missing. On Render → dropline → Environment, add DATABASE_URL from dropline-db (Internal Database URL), then Manual Deploy.',
    );
  }
  if (!envPresent('JWT_SECRET')) {
    throw new Error(
      'JWT_SECRET is missing. On Render → dropline → Environment, set JWT_SECRET (or sync from blueprint generateValue).',
    );
  }

  console.log('[startup] Ensuring user activity column…');
  try {
    await ensureUserActivityColumn();
  } catch (err) {
    console.error('[startup] ensureUserActivityColumn failed — check DATABASE_URL / Postgres', err);
    throw err;
  }

  try {
    console.log('[startup] Ensuring email/codes schema…');
    await ensureEmailVerificationSchema();
  } catch (err) {
    console.warn('[startup] Failed to ensure email/codes schema (non-fatal)', err);
  }

  try {
    await backfillEmailVerifiedAt();
  } catch (err) {
    console.warn('[startup] emailVerifiedAt backfill failed (non-fatal)', err);
  }

  try {
    console.log('[startup] Ensuring initial admin…');
    await ensureInitialAdmin();
  } catch (err) {
    console.warn('[startup] ensureInitialAdmin failed (non-fatal)', err);
  }

  try {
    await ensureAppleReviewInviteCode();
    await ensureAppleReviewAccount();
    await ensureAppleReviewExpiredAccount();
  } catch (err) {
    console.warn('[startup] Apple review account bootstrap failed (non-fatal)', err);
  }

  const app = createApp();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Dropline API listening on 0.0.0.0:${port}`);
  });
}

main().catch(err => {
  console.error('[startup] Fatal error — process exiting:', err);
  process.exit(1);
});
