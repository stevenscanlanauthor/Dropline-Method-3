import { LegalShell } from './PrivacyPage';
import { Link } from '../components/SiteNav';

export default function SupportPage() {
  return (
    <LegalShell title="Support">
      <section className="space-y-4 text-sm leading-relaxed">
        <p>Need help with Dropline? We&apos;re here.</p>
        <h2 className="text-lg font-semibold">Email</h2>
        <p>
          <a href="mailto:support@droplinemethod.com" className="text-[var(--accent)] underline">
            support@droplinemethod.com
          </a>
        </p>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p>
          Lifetime access is sold through the Mac App Store ($39) or iOS App Store ($29). Purchases unlock
          the same account on web, Mac, and iPhone. Visit <Link href="/billing" className="text-[var(--accent)] underline">Billing</Link> while signed in.
        </p>
        <h2 className="text-lg font-semibold">Trial</h2>
        <p>New accounts receive a 14-day free trial with full access. Lifetime access is a one-time purchase, not a subscription.</p>
        <h2 className="text-lg font-semibold">Delete account</h2>
        <p>
          Web/Mac: profile menu → Delete Account. iOS: Settings → Account → Delete Account.
          Type your email to confirm. Demo App Review accounts cannot be deleted.
        </p>
      </section>
    </LegalShell>
  );
}
