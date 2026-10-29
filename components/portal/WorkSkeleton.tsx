import { card } from './workspace-ui'

const bar = 'rounded-lg bg-[#E6EBF3] animate-pulse'

/** The shape of a staff workspace page (doctor or hospital) while it loads: the blue phone header and cards, or the desktop title, stats and panels. */
export function WorkSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="lg:hidden bg-[#2A4DD0] rounded-b-[28px] px-[18px] pt-[calc(env(safe-area-inset-top)+16px)] pb-[22px]">
        <div className="flex items-center gap-2.5">
          <span className="w-[30px] h-[30px] rounded-lg bg-white/20" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-4 w-40 rounded bg-white/25" />
            <span className="block h-3 w-24 rounded bg-white/15" />
          </span>
          <span className="w-10 h-10 rounded-full bg-white/25" />
        </div>
        <span className="block mt-6 h-7 w-48 rounded-lg bg-white/25" />
        <span className="block mt-2 h-3.5 w-56 rounded bg-white/15" />
      </div>
      <div className="px-4 pt-3.5 md:max-w-[720px] md:mx-auto lg:max-w-[1340px] lg:mx-0 lg:px-9 lg:pt-7 flex flex-col gap-3.5 lg:gap-5">
        <div className="hidden lg:block space-y-2">
          <div className={`${bar} h-7 w-72`} />
          <div className={`${bar} h-4 w-96 opacity-70`} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${card} p-4 lg:px-5 lg:py-[18px] space-y-3`}>
              <div className={`${bar} h-3 w-24 opacity-70`} />
              <div className={`${bar} h-7 w-14`} />
            </div>
          ))}
        </div>
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] gap-3.5 lg:gap-5">
          <div className={`${card} p-4 lg:p-[22px] space-y-4`}>
            <div className={`${bar} h-4 w-40`} />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#E6EBF3] animate-pulse shrink-0" />
                <span className="flex-1 space-y-1.5">
                  <span className={`${bar} block h-3.5 w-1/2`} />
                  <span className={`${bar} block h-3 w-1/3 opacity-70`} />
                </span>
              </div>
            ))}
          </div>
          <div className={`${card} p-4 lg:p-[22px] space-y-3`}>
            <div className={`${bar} h-4 w-28`} />
            <div className={`${bar} h-16 w-full opacity-70`} />
            <div className={`${bar} h-10 w-full`} />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
