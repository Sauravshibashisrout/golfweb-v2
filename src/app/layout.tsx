import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Nav from '@/components/ui/Nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GolfGives — Play with Purpose',
  description: 'A membership that turns every round into charity impact.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        <Nav />
        <div className="pt-16 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
