'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { initials } from '@/components/patient/format'

export type PillTab = {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  /** A longer label for wide screens. */
  wide?: string
  /** The Zebrold AI tab: highlighted icon. */
  ai?: boolean
  /** The profile tab: shown after a divider, with a round avatar icon. */
  profile?: boolean
  /** For the profile tab: the signed-in person's photo, or their name for initials. */
  avatar?: { name?: string | null; image?: string | null }
}

/**
 * The navigation bar every section uses, floating at the bottom of the screen. Phones get an icon-only glass pill
 * where the active tab sits in a soft capsule; larger screens get the labelled pill with the active tab filled blue.
 */
export function PillNav({ tabs, label }: { tabs: PillTab[]; label: string }) {
  return (
    <>
      <PhoneBar tabs={tabs} label={label} />
      <WideBar tabs={tabs} label={label} />
    </>
  )
}

function PhoneBar({ tabs, label }: { tabs: PillTab[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="md:hidden fixed z-50 inset-x-4 bottom-4 mb-[env(safe-area-inset-bottom)] rounded-full bg-surface-container-lowest/80 backdrop-blur-2xl backdrop-saturate-150 border border-outline-variant/30 shadow-[0_12px_40px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.8)] print:hidden"
    >
      <div className="flex items-center p-1.5">
        {tabs.map((t) => (
          <Link
            key={`${t.href}-${t.label}`}
            href={t.href}
            aria-current={t.active ? 'page' : undefined}
            aria-label={t.wide ?? t.label}
            className={`relative flex-1 min-w-0 h-12 flex items-center justify-center rounded-full transition-colors duration-200 ${
              t.active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant active:bg-on-surface/5'
            }`}
          >
            {t.profile && t.avatar ? (
              <Avatar avatar={t.avatar} icon={t.icon} className={`w-[30px] h-[30px] text-[11px] ${t.active ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest' : ''}`} />
            ) : (
              <span className="relative">
                <t.icon className="w-[26px] h-[26px]" strokeWidth={t.active ? 2.4 : 1.9} />
                {t.ai && <span aria-hidden className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}

function WideBar({ tabs, label }: { tabs: PillTab[]; label: string }) {
  // With more than six tabs, mid-size screens show icons plus the active tab's label.
  const crowded = tabs.length > 6
  return (
    <nav
      aria-label={label}
      className="hidden md:block fixed z-50 bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-32px)] rounded-full bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/40 shadow-[0_8px_30px_rgba(0,102,255,0.10)] print:hidden"
    >
      <div className="flex items-center gap-1.5 p-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const showLabel = !crowded || t.active
          return (
            <Fragment key={`${t.href}-${t.label}`}>
              {t.profile && <span aria-hidden className="h-6 w-px shrink-0 bg-outline-variant/50 mx-1" />}
              <Link
                href={t.href}
                aria-current={t.active ? 'page' : undefined}
                title={t.wide ?? t.label}
                className={`relative flex items-center justify-center gap-2 rounded-full transition-all font-label-sm text-label-sm font-semibold whitespace-nowrap ${
                  t.profile ? 'pl-2 pr-4 py-1.5' : 'px-5 py-2.5'
                } ${t.active ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
              >
                {t.profile ? (
                  t.avatar ? (
                    <Avatar avatar={t.avatar} icon={t.icon} className={`w-7 h-7 text-[10px] ${t.active ? 'ring-2 ring-on-primary/70' : ''}`} />
                  ) : (
                    <span className={`flex w-7 h-7 rounded-full items-center justify-center shrink-0 ${t.active ? 'bg-on-primary/20' : 'bg-primary text-on-primary'}`}>
                      <t.icon className="w-4 h-4" />
                    </span>
                  )
                ) : (
                  <span className="relative shrink-0">
                    <t.icon className={`w-5 h-5 ${t.ai && !t.active ? 'text-vibrant-blue' : ''}`} strokeWidth={t.active ? 2.2 : 1.8} />
                    {t.ai && !t.active && <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-fresh-teal ring-2 ring-surface-container-lowest" />}
                  </span>
                )}
                <span className={showLabel ? '' : 'sr-only lg:not-sr-only'}>
                  {t.wide ? (
                    <>
                      <span className="xl:hidden">{t.label}</span>
                      <span className="hidden xl:inline">{t.wide}</span>
                    </>
                  ) : (
                    t.label
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

/** The profile tab's round picture: the photo, else initials, else the tab's icon. */
function Avatar({ avatar, icon: Icon, className }: { avatar: NonNullable<PillTab['avatar']>; icon: LucideIcon; className: string }) {
  return (
    <span className={`rounded-full overflow-hidden bg-primary text-on-primary flex items-center justify-center font-bold shrink-0 ${className}`}>
      {avatar.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar.image} alt="" className="w-full h-full object-cover" />
      ) : avatar.name ? (
        initials(avatar.name)
      ) : (
        <Icon className="w-1/2 h-1/2" />
      )}
    </span>
  )
}
