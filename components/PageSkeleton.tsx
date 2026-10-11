/**
 * Loading placeholders for route segments (the loading.tsx files). Next.js shows these the moment a link is clicked,
 * while the server is still fetching the page, so navigation never looks frozen. Server-rendered, no JavaScript.
 */

const bar = 'rounded-md bg-slate-200/70'

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="w-full animate-pulse motion-reduce:animate-none">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

function Card({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-xl border border-slate-200/80 bg-surface-container-lowest ${className}`}>{children}</div>
}

function Rows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-slate-200/70 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className={`${bar} h-3.5 w-2/5`} />
            <div className={`${bar} h-3 w-3/5 bg-slate-100`} />
          </div>
          <div className={`${bar} h-8 w-20 hidden sm:block`} />
        </div>
      ))}
    </div>
  )
}

/** Inside a portal layout (doctor, hospital, lab, executive, admin): the top bar and dock are already on screen. */
export function PortalPageSkeleton() {
  return (
    <Shell label="Loading page">
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="space-y-2.5 pt-1">
          <div className={`${bar} h-7 w-56 md:w-72`} />
          <div className={`${bar} h-4 w-72 md:w-96 bg-slate-100`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="p-4 md:p-5 space-y-3">
              <div className={`${bar} h-3 w-20 bg-slate-100`} />
              <div className={`${bar} h-7 w-16`} />
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className={`${bar} h-4 w-40`} />
            <div className={`${bar} h-8 w-24 bg-slate-100`} />
          </div>
          <Rows />
        </Card>
      </div>
    </Shell>
  )
}

/** Patient pages draw their own top bar, so the placeholder includes one. */
export function PatientPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 h-16 border-b border-outline-variant/30 bg-surface-container-lowest" />
      <div className="max-w-[1240px] mx-auto px-margin-x-mobile lg:px-12 py-6 md:py-8">
        <PortalPageSkeleton />
      </div>
    </div>
  )
}

/** Public pages: the site header and footer stay in place around it. */
export function PublicPageSkeleton() {
  return (
    <Shell label="Loading page">
      <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop py-10 md:py-16">
        <div className="max-w-2xl space-y-4">
          <div className={`${bar} h-10 md:h-12 w-4/5`} />
          <div className={`${bar} h-10 md:h-12 w-3/5`} />
          <div className={`${bar} h-4 w-full bg-slate-100 mt-6`} />
          <div className={`${bar} h-4 w-5/6 bg-slate-100`} />
        </div>
        <div className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200/70 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className={`${bar} h-4 w-3/4`} />
                  <div className={`${bar} h-3 w-1/2 bg-slate-100`} />
                </div>
              </div>
              <div className={`${bar} h-3 w-full bg-slate-100`} />
              <div className={`${bar} h-9 w-full`} />
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  )
}
