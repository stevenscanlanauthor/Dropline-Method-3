import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import appleAuthRouter from './routes/appleAuth';
import booksRouter from './routes/books';
import adminRouter from './routes/admin';
import meRouter from './routes/me';
import iapRouter from './routes/iap';
import compatRouter from './routes/compat';
import webhooksRouter from './routes/webhooks';
import billingRouter from './routes/billing';
import setupRouter from './routes/setup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function buildAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  const set = new Set<string>();
  if (raw) {
    for (const part of raw.split(',')) {
      const o = normalizeOrigin(part);
      if (o) set.add(o);
    }
  }
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      set.add(normalizeOrigin(new URL(appUrl).origin));
    } catch {
      set.add(normalizeOrigin(appUrl));
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    set.add('http://localhost:5173');
    set.add('http://127.0.0.1:5173');
  }
  return [...set];
}

export function createApp(): Express {
  const app = express();
  const allowedOrigins = buildAllowedOrigins();

  app.set('trust proxy', 1);

  // Apple webhooks need raw body — mount before JSON parser
  app.use('/api', webhooksRouter);

  app.use(
    cors({
      credentials: true,
      origin: process.env.NODE_ENV === 'production'
        ? (origin, cb) => cb(null, origin !== undefined && allowedOrigins.includes(origin))
        : true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', appleAuthRouter);
  app.use('/api', meRouter);
  app.use('/api', iapRouter);
  app.use('/api', billingRouter);
  app.use('/api', booksRouter);
  app.use('/api', compatRouter);
  app.use('/api', adminRouter);
  app.use('/api', setupRouter);

  const webDist = process.env.WEB_DIST_PATH
    ?? path.resolve(__dirname, '../../web/dist');
  app.use(express.static(webDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });

  return app;
}
