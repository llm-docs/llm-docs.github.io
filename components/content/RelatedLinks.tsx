import Link from "next/link";

export function RelatedLinks({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; description?: string }[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="surface-card space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[1rem] border border-white/8 bg-[rgba(15,23,42,0.6)] p-4 transition hover:border-white/16"
          >
            <h3 className="text-base font-semibold text-slate-50">{item.label}</h3>
            {item.description ? (
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
