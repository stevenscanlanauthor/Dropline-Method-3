import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  tokenVersion: number;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

export function signToken(payload: AuthPayload, rememberMe: boolean): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: rememberMe ? '30d' : '24h',
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}
