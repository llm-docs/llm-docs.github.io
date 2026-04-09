import Link from "next/link";

export const metadata = {
  title: "Contact",
  description: "Contact and project links for LLM-Docs.",
};

export default function ContactPage() {
  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Contact</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Contact</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          For corrections, collaboration, or repository issues, use the project links below.
        </p>
      </header>

      <section className="surface-card space-y-4 text-sm leading-7 text-slate-300">
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
