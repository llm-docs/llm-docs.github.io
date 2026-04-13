import Link from "next/link";

const CONTACT_EMAIL = "contact@llm-docs.com";
const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/llmdocs";
const PATREON_URL = "https://patreon.com/llmdocs";

export const metadata = {
  title: "Contact",
  description: "Business collaboration, attribution requirements, and support links for LLM-Docs.",
};

export default function ContactPage() {
  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="hero-shell space-y-4 px-6 py-10 sm:px-8">
        <p className="eyebrow text-white/80">Contact</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">Business collaboration and support</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-200">
          Reach out for attribution questions, commercial use cases, partnerships, corrections, or support for the project.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card space-y-4">
          <p className="eyebrow">Email</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Email us</h2>
          <p className="text-sm leading-7 text-slate-300">
            For business collaboration, attribution requirements, commercial use cases, licensing questions, or corrections, email us directly.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="button-primary"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="surface-card space-y-4">
          <p className="eyebrow">Support</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Support LLM-Docs</h2>
          <p className="text-sm leading-7 text-slate-300">
            If the project saves you time, helps your research, or improves your team&apos;s decision-making, you can support it directly.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={BUY_ME_A_COFFEE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary"
            >
              Buy Me a Coffee
            </Link>
            <Link
              href={PATREON_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="button-secondary"
            >
              Patreon
            </Link>
          </div>
        </div>
      </section>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
        <p className="eyebrow">Attribution</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Attribution requirements</h2>
        <p>
          If you reference LLM-Docs in a report, newsletter, course, product page, or public research artifact, attribute the source clearly and link back to the relevant page when possible.
        </p>
        <p>
          Attribution should name <span className="font-semibold text-slate-100">LLM-Docs</span>, preserve any linked original sources, and avoid presenting LLM-Docs summaries as if they were the original publisher&apos;s text.
        </p>
        <p>
          If you need broader reuse terms, commercial attribution language, or a custom collaboration arrangement, email us before publishing.
        </p>
      </section>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
        <p className="eyebrow">Commercial</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Commercial use cases and questions</h2>
        <p>
          We can discuss business collaboration around research curation, structured model tracking, custom content packaging, editorial partnerships, sponsored knowledge surfaces, and commercial reuse questions.
        </p>
        <p>
          For commercial discussions, include your company name, intended use case, timeline, and the exact pages or datasets you want to use.
        </p>
      </section>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
        <p className="eyebrow">Project Links</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Repository and organization</h2>
        <p>
          GitHub organization:
          {" "}
          <Link href="https://github.com/LLM-Docs" className="text-sky-300 hover:text-sky-200">
            github.com/LLM-Docs
          </Link>
        </p>
        <p>
          Repository:
          {" "}
          <Link href="https://github.com/LLM-Docs/LLM-Docs.github.io" className="text-sky-300 hover:text-sky-200">
            LLM-Docs/LLM-Docs.github.io
          </Link>
        </p>
      </section>
    </article>
  );
}
