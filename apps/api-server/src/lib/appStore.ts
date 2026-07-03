import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IOS_BUNDLE_ID = process.env.APPLE_IOS_BUNDLE_ID ?? 'com.droplinemethod.app';
const MAC_BUNDLE_ID = process.env.APPLE_MAC_BUNDLE_ID ?? 'com.dropline.app';
const APP_APPLE_ID = Number(process.env.APPLE_APP_APPLE_ID ?? '6766370853');

export const IOS_PRODUCT_ID =
  process.env.APPLE_IOS_PRODUCT_ID ?? 'com.droplinemethod.app.lifetime';
export const MAC_PRODUCT_ID =
  process.env.APPLE_MAC_PRODUCT_ID ?? 'com.dropline.app.lifetime';

const ALLOWED_PRODUCT_IDS = new Set([IOS_PRODUCT_ID, MAC_PRODUCT_ID]);

function envFrom(value: string | undefined): Environment {
  switch ((value ?? 'production').toLowerCase()) {
    case 'sandbox':
      return Environment.SANDBOX;
    case 'xcode':
      return Environment.XCODE;
    default:
      return Environment.PRODUCTION;
  }
}

function loadAppleRoots(): Buffer[] {
  const dir = path.join(__dirname, 'apple-roots');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.cer'))
    .map(f => fs.readFileSync(path.join(dir, f)));
}

type VerifierPair = { sandbox: SignedDataVerifier; production: SignedDataVerifier };

const verifiersByBundle = new Map<string, VerifierPair>();

function getVerifiers(bundleId: string): VerifierPair {
  const cached = verifiersByBundle.get(bundleId);
  if (cached) return cached;
  const roots = loadAppleRoots();
  const enableOnlineChecks = process.env.APPLE_ENABLE_ONLINE_OCSP === '1';
  const pair: VerifierPair = {
    production: new SignedDataVerifier(
      roots,
      enableOnlineChecks,
      Environment.PRODUCTION,
      bundleId,
      APP_APPLE_ID,
    ),
    sandbox: new SignedDataVerifier(
      roots,
      enableOnlineChecks,
      Environment.SANDBOX,
      bundleId,
      undefined,
    ),
  };
  verifiersByBundle.set(bundleId, pair);
  return pair;
}

const PRIMARY_ENV = envFrom(process.env.APPLE_APP_STORE_ENV ?? process.env.IAP_ENV);

function pickVerifier(bundleId: string, envHint?: Environment): SignedDataVerifier {
  const v = getVerifiers(bundleId);
  const target = envHint ?? PRIMARY_ENV;
  return target === Environment.SANDBOX ? v.sandbox : v.production;
}

function bundleForProduct(productId: string): string {
  return productId === MAC_PRODUCT_ID ? MAC_BUNDLE_ID : IOS_BUNDLE_ID;
}

export async function verifyTransactionJws(
  jws: string,
  productIdHint?: string,
): Promise<JWSTransactionDecodedPayload> {
  const bundleId = productIdHint ? bundleForProduct(productIdHint) : IOS_BUNDLE_ID;
  const order =
    PRIMARY_ENV === Environment.SANDBOX
      ? [Environment.SANDBOX, Environment.PRODUCTION]
      : [Environment.PRODUCTION, Environment.SANDBOX];
  let lastErr: unknown;
  for (const env of order) {
    try {
      return await pickVerifier(bundleId, env).verifyAndDecodeTransaction(jws);
    } catch (err) {
      lastErr = err;
    }
  }
  if (bundleId !== MAC_BUNDLE_ID) {
    for (const env of order) {
      try {
        return await pickVerifier(MAC_BUNDLE_ID, env).verifyAndDecodeTransaction(jws);
      } catch (err) {
        lastErr = err;
      }
    }
  }
  throw lastErr;
}

export async function verifyNotificationJws(
  signedPayload: string,
): Promise<ResponseBodyV2DecodedPayload> {
  const order =
    PRIMARY_ENV === Environment.SANDBOX
      ? [Environment.SANDBOX, Environment.PRODUCTION]
      : [Environment.PRODUCTION, Environment.SANDBOX];
  let lastErr: unknown;
  for (const bundleId of [IOS_BUNDLE_ID, MAC_BUNDLE_ID]) {
    for (const env of order) {
      try {
        return await pickVerifier(bundleId, env).verifyAndDecodeNotification(signedPayload);
      } catch (err) {
        lastErr = err;
      }
    }
  }
  throw lastErr;
}

export function isAllowedProductId(productId: string): boolean {
  return ALLOWED_PRODUCT_IDS.has(productId);
}

export function uuidFromUserId(userId: string): string {
  const bytes = new Uint8Array(16);
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  let seed = h >>> 0;
  for (let i = 0; i < 16; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    bytes[i] = seed & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function appAccountTokenMatches(
  tokenFromApple: string | null | undefined,
  userId: string,
): boolean {
  if (!tokenFromApple) return false;
  const a = tokenFromApple.replace(/-/g, '').toLowerCase();
  const b = uuidFromUserId(userId).replace(/-/g, '').toLowerCase();
  return a === b;
}
