import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smart Poultry Decisions — Precision Farm Analytics',
  description: 'Predictive analytics and quantitative farm intelligence for African poultry operations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}