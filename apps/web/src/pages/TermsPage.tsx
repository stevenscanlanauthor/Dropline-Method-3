import { LegalShell } from './PrivacyPage';

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <section className="space-y-4 text-sm leading-relaxed">
        <p>By using Dropline you agree to these terms.</p>
        <h2 className="text-lg font-semibold">Service</h2>
        <p>
          Dropline provides a writing application using the Dropline Method. We offer a 14-day trial;
          continued use requires purchasing lifetime access via the App Store on Mac or iOS.
        </p>
        <h2 className="text-lg font-semibold">Your content</h2>
        <p>You retain ownership of your manuscripts. You grant us permission to store and sync your content to provide the service.</p>
        <h2 className="text-lg font-semibold">Refunds</h2>
        <p>App Store purchases are subject to Apple&apos;s refund policies.</p>
      </section>
    </LegalShell>
  );
}
