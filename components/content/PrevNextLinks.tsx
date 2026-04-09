import Link from "next/link";

export function PrevNextLinks({
  previous,
  next,
}: {
  previous?: { href: string; label: string } | null;
  next?: { href: string; label: string } | null;
}) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav className="grid gap-4 md:grid-cols-2">
      {previous ? (
        <Link href={previous.href} className="surface-card space-y-2 transition hover:border-white/16">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Previous</p>
          <p className="text-base font-semibold text-slate-50">{previous.label}</p>
        </Link>
      ) : <div />}
      {next ? (
        <Link href={next.href} className="surface-card space-y-2 text-left transition hover:border-white/16">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Next</p>
          <p className="text-base font-semibold text-slate-50">{next.label}</p>
        </Link>
      ) : <div />}
    </nav>
  );
}
