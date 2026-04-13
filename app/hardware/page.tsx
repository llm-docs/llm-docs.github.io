import Link from "next/link";

import { hardwareProfiles } from "@/data/hardware-profiles";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Hardware Guides | LLM-Docs",
  description: "Hardware profiles for local and server LLM inference, including VRAM, unified memory, and backend fit.",
  path: "/hardware",
});

export default function HardwareIndexPage() {
  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Hardware</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">LLM hardware guides</h1>
        <p className="max-w-4xl text-lg leading-8 text-slate-300">
          Browse practical hardware profiles for GPUs, Apple Silicon, and CPU-only setups, then check what each machine can realistically handle.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {hardwareProfiles.map((hardware) => (
          <Link
            key={hardware.id}
            href={`/hardware/${hardware.slug}`}
            className="surface-card group space-y-4 transition hover:border-white/16"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{hardware.vendor}</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-50 group-hover:text-sky-200">{hardware.name}</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                {hardware.class}
              </span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Memory</dt>
                <dd className="mt-2 text-sm text-slate-100">{hardware.vramGB ? `${hardware.vramGB} GB VRAM` : `${hardware.unifiedMemoryGB || hardware.systemRamGB} GB unified/RAM`}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Bandwidth</dt>
                <dd className="mt-2 text-sm text-slate-100">{hardware.bandwidthGBps} GB/s</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">Form factor</dt>
                <dd className="mt-2 text-sm capitalize text-slate-100">{hardware.formFactor}</dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </section>
  );
}
