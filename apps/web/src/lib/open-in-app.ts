/** Mac App Store listing — set VITE_MAC_APP_STORE_URL on Render when the app is live. */
export const MAC_APP_STORE_URL: string | undefined = (() => {
  const url = import.meta.env.VITE_MAC_APP_STORE_URL?.trim();
  return url || undefined;
})();

const OPEN_IN_APP_PATH = '/open-in-app';

/** True when the UI should offer “Open in App” (browser on macOS, not the Electron shell). */
export function shouldOfferOpenInApp(isDesktop: boolean): boolean {
  if (isDesktop) return false;
  if (typeof navigator === 'undefined') return false;
  return /Mac|Macintosh/i.test(navigator.platform || navigator.userAgent);
}

/**
 * Ask macOS to hand off to the installed Dropline Mac app (Associated Domains / Universal Links).
 * Safari may also show “Open in App” in the address bar when AASA is deployed.
 */
export function tryOpenInDesktopApp(): void {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.droplinemethod.com';
  const url = `${origin}${OPEN_IN_APP_PATH}`;

  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (MAC_APP_STORE_URL) {
    window.setTimeout(() => {
      window.open(MAC_APP_STORE_URL, '_blank', 'noopener,noreferrer');
    }, 1200);
  }
}
