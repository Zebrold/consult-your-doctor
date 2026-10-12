'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, X, type LucideIcon } from 'lucide-react'
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
 * The navigation bar every section uses, floating at the bottom of the screen. Phones get a glass tab bar with
 * labelled icons, the active one in a soft capsule (sections with more than five tabs show four and a More sheet);
 * larger screens get the labelled pill with the active tab filled blue.
 */
export function PillNav({ tabs, label }: { tabs: PillTab[]; label: string }) {
  return (
    <>
      <PhoneBar tabs={tabs} label={label} />
      <WideBar tabs={tabs} label={label} />
    </>
  )
}

/** Most tabs a phone bar shows; past this, the rest move into the More sheet. */
const PHONE_MAX = 5

function PhoneBar({ tabs, label }: { tabs: PillTab[]; label: string }) {
  const pathname = usePathname()
  // The sheet belongs to the page it was opened on, so it closes by itself once a tab navigates away.
  const [sheetPath, setSheetPath] = useState<string | null>(null)
  const sheetOpen = sheetPath === pathname
  const closeSheet = () => setSheetPath(null)

  const overflow = tabs.length > PHONE_MAX
  const shown = overflow ? tabs.slice(0, PHONE_MAX - 1) : tabs
  const more = overflow ? tabs.slice(PHONE_MAX - 1) : []
  const moreActive = more.some((t) => t.active)

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetPath(null)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  return (
    <>
      <nav
        aria-label={label}
        className="md:hidden fixed z-50 inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] rounded-[28px] bg-surface-container-lowest/85 backdrop-blur-2xl backdrop-saturate-150 border border-outline-variant/30 shadow-[0_12px_40px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.8)] print:hidden"
      >
        <div className="flex items-stretch p-1.5">
          {shown.map((t) => (
            <Link
              key={`${t.href}-${t.label}`}
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className={`group flex-1 min-w-0 h-14 flex flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors duration-200 active:bg-on-surface/5 ${
                t.active ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <TabIcon tab={t} />
              <TabLabel active={t.active}>{t.label}</TabLabel>
            </Link>
          ))}
          {overflow && (
            <button
              type="button"
              onClick={() => (sheetOpen ? closeSheet() : setSheetPath(pathname))}
              aria-expanded={sheetOpen}
              aria-haspopup="dialog"
              className={`flex-1 min-w-0 h-14 flex flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors duration-200 active:bg-on-surface/5 ${
                moreActive || sheetOpen ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${moreActive || sheetOpen ? 'bg-primary/10' : ''}`}>
                {sheetOpen ? <X className="w-[22px] h-[22px]" strokeWidth={2.2} /> : <LayoutGrid className="w-[22px] h-[22px]" strokeWidth={moreActive ? 2.3 : 1.9} />}
              </span>
              <TabLabel active={moreActive || sheetOpen}>More</TabLabel>
            </button>
          )}
        </div>
      </nav>

      {overflow && (
        <div
          className={`md:hidden fixed inset-0 z-[45] transition-[opacity,visibility] duration-200 print:hidden ${
            sheetOpen ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
          }`}
        >
          <button type="button" tabIndex={-1} aria-label="Close" onClick={closeSheet} className="absolute inset-0 w-full h-full bg-slate-900/30" />
          <div
            role="dialog"
            aria-label="More sections"
            className={`absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface-container-lowest shadow-[0_-12px_40px_rgba(15,23,42,0.16)] px-4 pt-2.5 pb-[calc(6.5rem+max(0.75rem,env(safe-area-inset-bottom)))] transition-transform duration-300 ease-out ${
              sheetOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <span aria-hidden className="block mx-auto mb-3 h-1 w-10 rounded-full bg-outline-variant" />
            <p className="px-1 pb-2 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">More</p>
            <div className="grid grid-cols-3 gap-2">
              {more.map((t) => (
                <Link
                  key={`${t.href}-${t.label}`}
                  href={t.href}
                  onClick={closeSheet}
                  tabIndex={sheetOpen ? undefined : -1}
                  aria-current={t.active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-2 min-h-[88px] px-2 py-3 rounded-2xl border text-center transition-colors active:scale-[0.98] ${
                    t.active ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
                  }`}
                >
                  {t.profile && t.avatar ? (
                    <Avatar avatar={t.avatar} icon={t.icon} className="w-7 h-7 text-[10px]" />
                  ) : (
                    <t.icon className={`w-6 h-6 ${t.ai && !t.active ? 'text-vibrant-blue' : ''}`} strokeWidth={t.active ? 2.2 : 1.9} />
                  )}
                  <span className="text-[12.5px] font-semibold leading-tight">{t.wide ?? t.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** A phone tab's icon; the active one sits in a soft capsule. */
function TabIcon({ tab: t }: { tab: PillTab }) {
  if (t.profile && t.avatar) {
    return (
      <span className="flex items-center justify-center h-7 w-12">
        <Avatar avatar={t.avatar} icon={t.icon} className={`w-6 h-6 text-[9px] ${t.active ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-container-lowest' : ''}`} />
      </span>
    )
  }
  return (
    <span className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${t.active ? 'bg-primary/10' : ''}`}>
      <t.icon className={`w-[22px] h-[22px] ${t.ai && !t.active ? 'text-vibrant-blue' : ''}`} strokeWidth={t.active ? 2.3 : 1.9} />
    </span>
  )
}

function TabLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return <span className={`max-w-full truncate px-0.5 text-[10.5px] min-[360px]:text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>{children}</span>
}

function WideBar({ tabs, label }: { tabs: PillTab[]; label: string }) {
  // With more than six tabs, mid-size screens show icons plus the active tab's label.
  const crowded = tabs.length > 6
  return (
    <nav
      aria-label={label}
      className="hidden md:block fixed z-50 bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-32px)] rounded-full bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/40 shadow-[0_8px_30px_rgba(15,23,42,0.04)] print:hidden"
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
