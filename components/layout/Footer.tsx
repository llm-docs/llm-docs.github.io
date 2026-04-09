import Image from 'next/image'
import Link from 'next/link'
import { BookOpenText, Code2, Newspaper, Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-white/50 bg-[rgba(255,255,255,0.35)]">
      <div className="page-shell py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="LLM-Docs logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-slate-200"
              />
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                LLM-Docs
              </h3>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              The GitHub home for LLM documentation, model tracking, and ecosystem updates.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-950">Library</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/docs" className="inline-flex items-center gap-2 transition-colors hover:text-slate-950"><BookOpenText className="h-4 w-4" />Docs</Link></li>
              <li><Link href="/news" className="inline-flex items-center gap-2 transition-colors hover:text-slate-950"><Newspaper className="h-4 w-4" />Updates</Link></li>
              <li><Link href="/models" className="inline-flex items-center gap-2 transition-colors hover:text-slate-950"><Sparkles className="h-4 w-4" />Models</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-950">Collections</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/agents" className="transition-colors hover:text-slate-950">Agent frameworks</Link></li>
              <li><Link href="/docs/getting-started-llms" className="transition-colors hover:text-slate-950">Getting started</Link></li>
              <li><Link href="/docs/prompt-engineering" className="transition-colors hover:text-slate-950">Prompt engineering</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-950">Source</h4>
            <p className="text-sm leading-6 text-slate-600">
              Maintain content in `content/docs`, `content/news`, `content/models`, and `content/agents`.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com/LLM-Docs" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition-colors hover:text-slate-950">
                <Code2 className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 sm:flex-row">
          <p>
            © 2026 LLM-Docs.
          </p>
        </div>
      </div>
    </footer>
  )
}
