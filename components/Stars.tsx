import { Star } from 'lucide-react'

/** A 0–5 star rating, filled to the nearest half star. */
export function Stars({ value, className = 'w-4 h-4', tone = 'text-amber-500' }: { value: number; className?: string; tone?: string }) {
  const rounded = Math.round(value * 2) / 2
  return (
    <span className={`inline-flex items-center gap-0.5 ${tone}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'none'
        return (
          <span key={n} className="relative inline-flex">
            <Star className={`${className} ${fill === 'full' ? 'fill-current' : 'opacity-35'}`} aria-hidden />
            {fill === 'half' && (
              <span className="absolute inset-0 overflow-hidden w-1/2">
                <Star className={`${className} fill-current`} aria-hidden />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
