import Link from "next/link";

import type { Heading } from "@/lib/headings";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length < 2) {
    return null;
  }

  return (
    <aside className="surface-card space-y-4">
      <h2 className="text-lg font-semibold text-slate-50">Table of contents</h2>
      <ul className="space-y-2 text-sm text-slate-300">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level > 2 ? "pl-4" : ""}>
            <Link href={`#${heading.id}`} className="transition hover:text-white">
              {heading.text}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
