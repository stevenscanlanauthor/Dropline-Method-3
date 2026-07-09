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

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      'DATABASE_URL is missing. On Render → dropline → Environment, link dropline-db (or set DATABASE_URL).',
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
  app.listen(port, () => {
    console.log(`Dropline API listening on port ${port}`);
  });
}

main().catch(err => {
  console.error('[startup] Fatal error — process exiting:', err);
  process.exit(1);
});
