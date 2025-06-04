import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from '../providers/convex-provider'

export const metadata: Metadata = {
  title: 'Spatium',
  description: 'A tool for figuring out how to make your space work for you',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  )
}
