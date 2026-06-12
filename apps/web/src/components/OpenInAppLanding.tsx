import { MAC_APP_STORE_URL } from '../lib/open-in-app';

export default function OpenInAppLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--mist)] px-6 text-center">
      <img
        src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`}
        alt=""
        className="h-16 w-16 mb-6"
        aria-hidden
      />
      <h1 className="text-xl font-semibold text-[var(--ink)]">Opening Dropline for Mac…</h1>
      <p className="mt-3 text-sm text-[var(--muted)] max-w-md leading-relaxed">
        If the Mac app is installed, it should open this project in Dropline. Otherwise continue in your browser or install the app.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <a
          href="/"
          className="text-sm px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90"
        >
          Continue in browser
        </a>
        {MAC_APP_STORE_URL && (
          <a
            href={MAC_APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-5 py-2.5 rounded-lg border border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[var(--mist)]"
          >
            Get Dropline for Mac
          </a>
        )}
      </div>
    </div>
  );
}
