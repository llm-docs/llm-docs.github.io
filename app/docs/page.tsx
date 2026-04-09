import Link from "next/link";

import { getDocs } from "@/lib/content";

function formatDate(date: string) {
  if (!date) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export const metadata = {
  title: "Docs",
  description: "LLM documentation and guides",
};

export default async function DocsIndexPage() {
  const docs = await getDocs();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Docs</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Documentation library</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          Markdown files in `content/docs` become documentation pages automatically.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {docs.map((doc) => (
          <Link key={doc.slug} href={`/docs/${doc.slug}`} className="surface-card group space-y-3 transition hover:-translate-y-0.5 hover:border-slate-300">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              {doc.category} • {formatDate(doc.date)}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 group-hover:text-slate-700">
              {doc.title}
            </h2>
            <p className="text-sm leading-6 text-slate-600">{doc.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
