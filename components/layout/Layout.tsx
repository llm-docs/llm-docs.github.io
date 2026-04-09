import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="page-shell flex-1 py-8">{children}</main>
      <Footer />
    </div>
  )
}
