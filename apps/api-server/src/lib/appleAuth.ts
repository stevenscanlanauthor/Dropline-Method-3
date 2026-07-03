import { createRemoteJWKSet, jwtVerify } from 'jose';

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const IOS_BUNDLE_ID = process.env.APPLE_IOS_BUNDLE_ID ?? 'com.droplinemethod.app';

export interface AppleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: IOS_BUNDLE_ID,
  });
  if (typeof payload.sub !== 'string') {
    throw new Error('Apple identity token missing sub');
  }
  const email = typeof payload.email === 'string' ? payload.email : null;
  const emailVerified =
    payload.email_verified === true || payload.email_verified === 'true';
  return { sub: payload.sub, email, emailVerified };
}
