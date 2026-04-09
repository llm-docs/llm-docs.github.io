import Image from 'next/image'
import Link from 'next/link'
import { BookOpenText, Bot, Code2, Newspaper, Sparkles } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(5,8,22,0.84)] backdrop-blur-xl">
      <div className="page-shell">
        <div className="flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="LLM-Docs logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/12"
                priority
              />
              <span className="text-lg font-semibold tracking-tight text-slate-50">
                LLM-Docs
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              <Link href="/docs" className="flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
                <BookOpenText className="h-4 w-4" />
                Docs
              </Link>
              <Link href="/news" className="flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
                <Newspaper className="h-4 w-4" />
                Updates
              </Link>
              <Link href="/models" className="flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
                <Sparkles className="h-4 w-4" />
                Models
              </Link>
              <Link href="/agents" className="flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
                <Bot className="h-4 w-4" />
                Agents
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="https://github.com/LLM-Docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-slate-300 transition-colors hover:border-white/30 hover:text-white"
              aria-label="GitHub"
            >
              <Code2 className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
