export const metadata = {
  title: "Terms of Use",
  description: "Terms of use for IntuiVortex.",
};

export default function TermsPage() {
  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Terms</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Terms of Use</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          By using IntuiVortex, you agree to use the website for lawful informational and research purposes only.
        </p>
      </header>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
        <p>The information on this website is provided for general informational purposes and may change without notice.</p>
        <p>External model details, release notes, and linked sources remain the property and responsibility of their original publishers.</p>
        <p>IntuiVortex does not guarantee completeness, accuracy, or suitability for any particular commercial, legal, financial, or technical decision.</p>
      </section>
    </article>
  );
}
