import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { db, usersTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { verifyToken, type AuthPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function getAuth(req: Request): AuthPayload | undefined {
  return req.auth;
}

export function requireAuth(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.auth_token;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const payload = verifyToken(token);
      const rows = await db
        .select({ tokenVersion: usersTable.tokenVersion, isDisabled: usersTable.isDisabled })
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);
      if (!rows[0] || rows[0].tokenVersion !== payload.tokenVersion) {
        res.status(401).json({ error: 'Session expired. Please sign in again.' });
        return;
      }
      if (rows[0].isDisabled) {
        res.status(403).json({ error: 'Account is disabled.' });
        return;
      }
      req.auth = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}

export function requireAdmin(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rows = await db
      .select({ isAdmin: usersTable.isAdmin, isDisabled: usersTable.isDisabled })
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId))
      .limit(1);
    if (!rows[0]?.isAdmin) {
      res.status(403).json({ error: 'Forbidden: admin only' });
      return;
    }
    if (rows[0].isDisabled) {
      res.status(403).json({ error: 'Account is disabled.' });
      return;
    }
    next();
  };
}
