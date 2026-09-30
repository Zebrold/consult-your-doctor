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
    <div className="relative isolate overflow-hidden min-h-[calc(100vh-5rem)] bg-surface flex items-center justify-center p-4 sm:p-8 font-sans">
      <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div aria-hidden className="absolute top-1/2 right-10 w-[300px] h-[300px] bg-fresh-teal/5 rounded-full blur-2xl pointer-events-none -z-10" />
      {children}
    </div>
  )
}
