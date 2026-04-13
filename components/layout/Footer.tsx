import Image from 'next/image'
import Link from 'next/link'
import { BookOpenText, Newspaper, Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-white/8 bg-[rgba(4,8,20,0.72)]">
      <div className="page-shell py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="IntuiVortex logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/12"
              />
              <h3 className="text-lg font-semibold tracking-tight text-slate-50">
                IntuiVortex
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-100">Library</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/docs" className="inline-flex items-center gap-2 transition-colors hover:text-white"><BookOpenText className="h-4 w-4" />Docs</Link></li>
              <li><Link href="/news" className="inline-flex items-center gap-2 transition-colors hover:text-white"><Newspaper className="h-4 w-4" />Updates</Link></li>
              <li><Link href="/models" className="inline-flex items-center gap-2 transition-colors hover:text-white"><Sparkles className="h-4 w-4" />Models</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-100">Collections</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/agents" className="transition-colors hover:text-white">Agent frameworks</Link></li>
              <li><Link href="/docs/getting-started-llms" className="transition-colors hover:text-white">Getting started</Link></li>
              <li><Link href="/docs/prompt-engineering" className="transition-colors hover:text-white">Prompt engineering</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-slate-100">Site Info</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/contact" className="transition-colors hover:text-white">Contact</Link></li>
              <li><Link href="/terms" className="transition-colors hover:text-white">Terms of use</Link></li>
              <li><Link href="/privacy" className="transition-colors hover:text-white">Privacy policy</Link></li>
              <li><Link href="/editorial-policy" className="transition-colors hover:text-white">Editorial policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 text-sm text-slate-500 sm:flex-row">
          <p>
            © 2026 IntuiVortex.
          </p>
        </div>
      </div>
    </footer>
  )
}
