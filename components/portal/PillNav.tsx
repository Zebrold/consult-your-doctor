'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export type PillTab = {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  /** A longer label for wide screens. */
  wide?: string
  /** A shorter label for phones when the bar has six tabs. */
  short?: string
  /** The Zebrold AI tab: highlighted icon. */
  ai?: boolean
  /** The profile tab: shown after a divider, with a round avatar icon. */
  profile?: boolean
}

/**
 * The rounded navigation bar every section uses: a floating glass pill at the bottom of the screen, the active tab
 * filled blue. On phones a six-tab bar gives the active tab more room and uses the others' short labels; with more
 * tabs, phones show icons only, plus the active tab's label.
 */
export function PillNav({ tabs, label }: { tabs: PillTab[]; label: string }) {
  const dense = tabs.length >= 6
  const crowded = tabs.length > 6
  return (
    <nav
      aria-label={label}
      className="fixed z-50 inset-x-3 bottom-3 md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-max md:max-w-[calc(100vw-32px)] mb-[env(safe-area-inset-bottom)] rounded-full bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/40 shadow-[0_8px_30px_rgba(0,102,255,0.10)] print:hidden"
    >
      <div className="flex items-center gap-1 md:gap-1.5 p-1.5 md:p-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const showLabel = !crowded || t.active
          const full = t.wide ? (
            <>
              <span className="xl:hidden">{t.label}</span>
              <span className="hidden xl:inline">{t.wide}</span>
            </>
          ) : (
            t.label
          )
          const phoneLabel = dense && !t.active ? t.short : undefined
          return (
            <Fragment key={`${t.href}-${t.label}`}>
              {t.profile && <span aria-hidden className="hidden md:block h-6 w-px shrink-0 bg-outline-variant/50 mx-1" />}
              <Link
                href={t.href}
                aria-current={t.active ? 'page' : undefined}
                title={t.wide ?? t.label}
                className={`relative min-w-0 ${dense && t.active ? 'flex-[1.6]' : 'flex-1'} md:flex-none flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 rounded-full py-1.5 px-1 transition-all font-label-sm text-[10px] md:text-label-sm font-semibold whitespace-nowrap ${
                  t.profile ? 'md:pl-2 md:pr-4 md:py-1.5' : 'md:px-5 md:py-2.5'
                } ${t.active ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
              >
                {t.profile && !t.active ? (
                  <>
                    <t.icon className="md:hidden w-5 h-5" strokeWidth={1.8} />
                    <span className="hidden md:flex w-7 h-7 rounded-full bg-primary text-on-primary items-center justify-center shrink-0">
                      <t.icon className="w-4 h-4" />
                    </span>
                  </>
                ) : (
                  <span className="relative shrink-0">
                    <t.icon className={`w-5 h-5 ${t.ai && !t.active ? 'text-vibrant-blue' : ''}`} strokeWidth={t.active ? 2.2 : 1.8} />
                    {t.ai && !t.active && <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />}
                  </span>
                )}
                <span className={`max-w-full truncate ${showLabel ? '' : 'sr-only lg:not-sr-only'}`}>
                  {phoneLabel ? (
                    <>
                      <span className="sm:hidden">{phoneLabel}</span>
                      <span className="hidden sm:inline">{full}</span>
                    </>
                  ) : (
                    full
                  )}
                </span>
              </Link>
            </Fragment>
          )
        })}
      </div>
    </nav>
  )
}
