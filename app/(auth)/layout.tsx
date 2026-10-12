import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication',
}

// The site header and footer come from the root layout (ConditionalLayout).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate overflow-hidden min-h-[calc(100dvh-var(--header-h))] bg-white flex items-center justify-center p-4 sm:p-8 font-sans">
      {children}
    </div>
  )
}
