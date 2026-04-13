export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for IntuiVortex.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Privacy</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Privacy Policy</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          IntuiVortex aims to minimize data collection and does not require user accounts to browse public content.
        </p>
      </header>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
        <p>If analytics or third-party services are added later, this page should be updated to disclose what is collected and why.</p>
        <p>When you follow external links, you leave this website and become subject to the privacy policies of those third-party sites.</p>
        <p>
          We encourage open-source projects. The full source code for this website is available on GitHub at{" "}
          <a
            href="https://github.com/intuivortex/intuivortex.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-300 transition-colors hover:text-sky-200"
          >
            github.com/intuivortex/intuivortex.github.io
          </a>
          .
        </p>
      </section>
    </article>
  );
}
