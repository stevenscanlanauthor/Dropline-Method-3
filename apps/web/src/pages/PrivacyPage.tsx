import type { ReactNode } from 'react';
import { Link } from '../components/SiteNav';

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p className="text-sm text-[var(--muted)] mb-6">Last updated: July 2026</p>
      <section className="space-y-4 text-sm leading-relaxed">
        <p>
          Dropline (&quot;we&quot;, &quot;us&quot;) operates droplinemethod.com and the Dropline apps for Mac and iOS.
          This policy explains what we collect and how we use it.
        </p>
        <h2 className="text-lg font-semibold pt-2">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account email and display name when you sign up or use Sign in with Apple.</li>
          <li>Your book projects and chapter content stored in our cloud for sync across devices.</li>
          <li>Purchase records when you buy lifetime access via the App Store.</li>
          <li>Security logs (sign-in attempts, IP addresses) to protect accounts.</li>
        </ul>
        <h2 className="text-lg font-semibold pt-2">Email confirmation</h2>
        <p>
          New email/password accounts must confirm their email address before signing in. Sign in with Apple accounts are treated as verified.
        </p>
        <h2 className="text-lg font-semibold pt-2">Account deletion</h2>
        <p>
          You can delete your account in the app: open the profile menu (web/Mac) or Settings → Account (iOS), choose Delete Account,
          and confirm. This permanently removes your account and cloud projects from our servers. Local files you saved on your device remain under your control.
        </p>
        <h2 className="text-lg font-semibold pt-2">What we do not sell</h2>
        <p>We do not sell your personal data or manuscript content to third parties.</p>
        <h2 className="text-lg font-semibold pt-2">Contact</h2>
        <p>
          Email <a href="mailto:support@droplinemethod.com" className="text-[var(--accent)] underline">support@droplinemethod.com</a> for
          privacy questions. Prefer in-app Delete Account for account removal.
        </p>
      </section>
    </LegalShell>
  );
}

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-[var(--accent)]">← Back to Dropline</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export { LegalShell };
