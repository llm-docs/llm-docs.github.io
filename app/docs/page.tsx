import DocsExplorer from "@/components/explore/DocsExplorer";
import { getDocs } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Docs | LLM-Docs",
  description: "LLM documentation, implementation guides, and practical references.",
  path: "/docs",
});

export default async function DocsIndexPage() {
  const docs = await getDocs();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Docs</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Documentation library</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Clear guides, references, and practical documentation for working with modern AI models.
        </p>
      </header>

      <DocsExplorer docs={docs} />
    </section>
  );
}
