export const metadata = {
  title: "About",
  description: "About LLM-Docs and how the website is structured.",
};

export default function AboutPage() {
  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">About</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">About LLM-Docs</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          LLM-Docs is a structured website for tracking language models, AI releases, comparisons, documentation, and ecosystem changes.
        </p>
      </header>

      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-50">What the site covers</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300">
          <li>Model pages and release tracking</li>
          <li>AI news and update summaries</li>
          <li>Comparison pages between models</li>
          <li>Guides, prompt engineering, and reference content</li>
          <li>Agent frameworks and tooling references</li>
        </ul>
      </section>
    </article>
  );
}
