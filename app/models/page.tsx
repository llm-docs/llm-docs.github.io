import { getModels } from "@/lib/content";
import ModelExplorer from "@/components/explore/ModelExplorer";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Models | LLM-Docs",
  description: "Track language models, releases, context windows, and provider updates.",
  path: "/models",
});

export default async function ModelsIndexPage() {
  const models = await getModels();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Models</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Model tracker</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Track leading models by provider, capabilities, release history, and practical use cases.
        </p>
      </header>

      <ModelExplorer models={models} />
    </section>
  );
}
