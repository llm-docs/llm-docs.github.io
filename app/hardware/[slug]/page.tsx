import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { hardwareProfiles, getHardwareProfileBySlug } from "@/data/hardware-profiles";
import { backendLabels, getPreferredBackend, getRecommendedModelsForHardware } from "@/lib/deployment";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return hardwareProfiles.map((hardware) => ({ slug: hardware.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hardware = getHardwareProfileBySlug(slug);

  if (!hardware) {
    return {};
  }

  return buildPageMetadata({
    title: `${hardware.name} Guide | IntuiVortex`,
    description: `Hardware fit guide for ${hardware.name}, including model recommendations and deployment notes.`,
    path: `/hardware/${hardware.slug}`,
  });
}

export default async function HardwarePage({ params }: PageProps) {
  const { slug } = await params;
  const hardware = getHardwareProfileBySlug(slug);

  if (!hardware) {
    notFound();
  }

  const recommendations = getRecommendedModelsForHardware(hardware);
  const comfortable = recommendations.filter((item) => item.estimate.fitTier === "comfortable").slice(0, 4);
  const borderline = recommendations.filter((item) => item.estimate.fitTier === "yes" || item.estimate.fitTier === "barely").slice(0, 4);
  const backend = getPreferredBackend(hardware);

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/hardware", label: "Hardware" },
          { href: `/hardware/${hardware.slug}`, label: hardware.name },
        ]}
      />

      <header className="space-y-4">
        <div className="space-y-3">
          <p className="eyebrow">{hardware.vendor}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{hardware.name}</h1>
          <p className="max-w-4xl text-lg leading-8 text-slate-300">
            Practical deployment guidance for this machine, using conservative fit estimates instead of marketing-style claims.
          </p>
        </div>
        <dl className="grid gap-3 rounded-[1.5rem] border border-white/8 bg-[rgba(9,15,32,0.8)] p-5 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Memory</dt>
            <dd className="mt-2 text-sm text-slate-100">
              {hardware.vramGB ? `${hardware.vramGB} GB VRAM` : `${hardware.unifiedMemoryGB || hardware.systemRamGB} GB unified/RAM`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">System RAM</dt>
            <dd className="mt-2 text-sm text-slate-100">{hardware.systemRamGB} GB</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Bandwidth</dt>
            <dd className="mt-2 text-sm text-slate-100">{hardware.bandwidthGBps} GB/s</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Preferred backend</dt>
            <dd className="mt-2 text-sm text-slate-100">{backendLabels[backend]}</dd>
          </div>
        </dl>
      </header>

      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-50">Hardware notes</h2>
        <ul className="space-y-2 text-sm leading-7 text-slate-300">
          {hardware.notes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Comfortable fits</h2>
          <div className="space-y-3">
            {comfortable.length ? comfortable.map(({ model, estimate }) => (
              <div key={model.id} className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.55)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-50">{model.name}</p>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                    {estimate.fitTier}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Q4 at 8k context is estimated at {estimate.totalRequiredGB} GB total and {estimate.estimatedTokensPerSecondRange}.
                </p>
              </div>
            )) : <p className="text-sm text-slate-300">No comfortable fits in the current seed dataset.</p>}
          </div>
        </div>

        <div className="surface-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Borderline fits</h2>
          <div className="space-y-3">
            {borderline.length ? borderline.map(({ model, estimate }) => (
              <div key={model.id} className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.55)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-50">{model.name}</p>
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                    {estimate.fitTier}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{estimate.recommendation}</p>
              </div>
            )) : <p className="text-sm text-slate-300">This machine either fits the small set comfortably or falls straight into no-fit territory.</p>}
          </div>
        </div>
      </section>

      <section className="surface-card space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-50">Backend support</h2>
          <p className="text-sm leading-6 text-slate-300">
            These are the runtimes currently associated with this hardware profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hardware.backendSupport.map((item) => (
            <span key={item} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200">
              {backendLabels[item]}
            </span>
          ))}
        </div>
      </section>

      <section className="surface-card space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-50">Use the live calculator</h2>
          <p className="text-sm leading-6 text-slate-300">
            The calculator lets you change context length, runtime, quantization, and concurrency instead of relying on a fixed profile.
          </p>
        </div>
        <Link href="/calculator" className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
          Open calculator
        </Link>
      </section>
    </article>
  );
}
