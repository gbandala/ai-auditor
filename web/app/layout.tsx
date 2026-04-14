import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Readability Auditor',
  description: 'Descubre qué tan visible es tu sitio para ChatGPT, Perplexity y Google AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#f9fafb', color: '#111827' }}>
        {children}
      </body>
    </html>
  )
}
