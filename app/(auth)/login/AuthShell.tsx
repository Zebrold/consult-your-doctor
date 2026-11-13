import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, ClipboardCheck, UserPlus, Wallet } from 'lucide-react'
import { AuthIncluded } from './AuthIncluded'

// The login pages, after the user's login designs: on desktops a blue half with the brand, what the portal is, "See
// what's included" and its picture, beside a white half with the form. Phones get the blue part as a short header
// (the list folded away) and the form below it.

export type AuthPoint = { title: string; text: string }

export type AuthPanel = {
  title: string
  lead: string
  /** What the portal does, true to lib/assistant/knowledge.ts. */
  points: AuthPoint[]
  art: 'doctor' | 'hospital' | 'lab' | 'executive'
}

export const authLabel = 'block text-[15px] font-bold text-[#0B1B3F]'
/** The red mark after a required field's label. */
export const authRequired = <span aria-hidden className="text-[#D92D20]"> *</span>
export const authField =
  'w-full h-[50px] px-4 rounded-[10px] bg-white border border-[#D0D7E2] text-[15.5px] text-[#0B1B3F] placeholder:text-[#9AA4B5] outline-none transition-shadow focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/15 disabled:opacity-60'
export const authHelp = 'mt-2 text-[13px] leading-[1.5] text-[#5B667A]'
export const authButton =
  'w-full h-[52px] px-6 rounded-[10px] bg-[#1D4ED8] hover:bg-[#1A44C2] text-white text-[17px] font-extrabold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:opacity-60'
export const authLink = 'font-extrabold text-[#1D4ED8] hover:underline underline-offset-4'
export const authError = 'p-3 rounded-[10px] bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-semibold'
export const authTitle = 'text-[26px] lg:text-[30px] leading-[1.2] font-extrabold tracking-[-0.02em]'
export const authLead = 'mt-2 text-[15px] lg:text-[15.5px] leading-[1.55] text-[#5B667A]'
/** The lines under the form: the patient login, help. */
export const authFooter = 'mt-8 pt-6 border-t border-[#E6EBF3] space-y-2 text-[14.5px] text-[#5B667A]'

/** "By logging in, you agree to our Terms…", under the button. */
export function AuthTerms({ verb = 'logging in' }: { verb?: string }) {
  const link = 'text-[#1D4ED8] underline underline-offset-2 hover:text-[#1A44C2]'
  return (
    <p className="text-[13.5px] leading-[1.6] text-[#5B667A]">
      By {verb}, you agree to our{' '}
      <Link className={link} href="/terms-of-use">
        Terms &amp; Conditions
      </Link>
      . For how we handle your data, see our{' '}
      <Link className={link} href="/privacy-policy">
        Privacy Policy
      </Link>
      .
    </p>
  )
}

/** The top-right line, e.g. "Not a partner yet? Register your hospital →". */
export function AuthCorner({ lead, label, href, onClick }: { lead: string; label: string; href?: string; onClick?: () => void }) {
  const cls = 'inline-flex items-center gap-1 font-extrabold text-[#0B1B3F] underline underline-offset-[6px] decoration-[1.5px] hover:text-[#1D4ED8]'
  return (
    <>
      <span className="text-[#5B667A]">{lead}</span>{' '}
      {href ? (
        <Link href={href} className={cls}>
          {label} <ArrowRight aria-hidden className="w-3.5 h-3.5" strokeWidth={2.6} />
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cls}>
          {label} <ArrowRight aria-hidden className="w-3.5 h-3.5" strokeWidth={2.6} />
        </button>
      ) : (
        <span className="font-extrabold text-[#0B1B3F]">{label}</span>
      )}
    </>
  )
}

export function AuthShell({ panel, corner, children }: { panel: AuthPanel; corner?: ReactNode; children: ReactNode }) {
  return (
    <div className="w-full min-h-[calc(100dvh-var(--strip-h))] lg:grid lg:grid-cols-2 bg-white font-(family-name:--font-manrope) text-[#0B1B3F]">
      <aside className="relative isolate overflow-hidden flex flex-col rounded-b-[28px] lg:rounded-none bg-[linear-gradient(165deg,#3062F2_0%,#1D4ED8_42%,#1B3FB6_100%)] text-white px-5 sm:px-8 pt-5 pb-7 lg:px-[clamp(48px,9vw,130px)] lg:pt-14 lg:pb-0">
        {/* A faint dot grid that fades in towards the bottom, and two rings behind the picture */}
        <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.17)_1px,transparent_1.3px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,transparent_20%,#000_85%)]" />
        <span aria-hidden className="hidden lg:block absolute -z-10 left-1/2 -translate-x-1/2 -bottom-[330px] w-[680px] h-[680px] rounded-full bg-white/[0.045]" />
        <span aria-hidden className="hidden lg:block absolute -z-10 left-1/2 -translate-x-1/2 -bottom-[250px] w-[520px] h-[520px] rounded-full bg-white/[0.05]" />

        <Link href="/" aria-label="Consult your Doctor home" className="self-start inline-flex items-center gap-2.5 text-white">
          <Image src="/logo-icon-white.png" alt="" width={72} height={72} priority className="w-7 h-7 lg:w-[30px] lg:h-[30px] object-contain" />
          <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[18px] lg:text-[20px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
        </Link>

        <p className="mt-7 lg:mt-[clamp(32px,6vh,84px)] text-[28px] sm:text-[32px] lg:text-[clamp(32px,2.9vw,42px)] leading-[1.12] font-extrabold tracking-[-0.03em] max-w-[520px]">
          {panel.title}
        </p>
        <p className="mt-3 lg:mt-4 max-w-[470px] text-[14.5px] lg:text-[17px] leading-[1.6] text-[#DCE6FF]">{panel.lead}</p>
        <AuthIncluded points={panel.points} />

        {/* The picture takes what height is left, so the half fits the screen; it stays anchored to the bottom. */}
        <div aria-hidden className="hidden lg:block relative flex-1 min-h-[170px] mt-8">
          <PanelArt kind={panel.art} />
        </div>
      </aside>

      <div className="relative flex flex-col px-5 sm:px-8 lg:px-12 pt-8 pb-10 lg:py-10">
        {corner && <p className="order-last lg:order-none mt-6 lg:mt-0 lg:absolute lg:top-9 lg:right-14 text-center lg:text-right text-[14.5px]">{corner}</p>}
        <div className="w-full max-w-[480px] mx-auto lg:my-auto lg:py-12">{children}</div>
      </div>
    </div>
  )
}

/** The picture at the foot of the blue half: the home page's pictures, or a sketch of the executive portal. */
function PanelArt({ kind }: { kind: AuthPanel['art'] }) {
  const pic = 'absolute left-1/2 -translate-x-1/2 w-auto max-w-[92%] object-contain object-bottom drop-shadow-[0_20px_30px_rgba(4,16,70,0.35)]'
  if (kind === 'doctor') return <Image src="/images/home/doctor.webp" alt="" width={376} height={518} sizes="260px" className={`${pic} bottom-0 h-full max-h-[360px]`} />
  if (kind === 'hospital') return <Image src="/images/home/hospital-building.webp" alt="" width={787} height={357} sizes="480px" className={`${pic} bottom-5 h-[calc(100%-20px)] max-h-[220px]`} />
  if (kind === 'lab') return <Image src="/images/home/lab-microscope.webp" alt="" width={419} height={395} sizes="300px" className={`${pic} bottom-3 h-[calc(100%-12px)] max-h-[300px]`} />
  return <ExecutiveArt />
}

/** The executive portal's main parts as a card rising from the bottom edge (no figures: it is a sketch, not data). */
function ExecutiveArt() {
  const tiles = [
    { icon: ClipboardCheck, label: 'Applications' },
    { icon: UserPlus, label: 'Walk-ins' },
    { icon: Wallet, label: 'Wallets' },
  ]
  const rows = [
    { name: 'Hospital applications', pill: 'Approve & add', tone: 'bg-[#EEF3FF] text-[#1D4ED8]' },
    { name: 'Diagnostic centre applications', pill: 'Approve & add', tone: 'bg-[#EEF3FF] text-[#1D4ED8]' },
    { name: 'Doctor applications', pill: 'Review', tone: 'bg-[#FFF4E5] text-[#B54708]' },
  ]
  return (
    // It starts at least 250px above the bottom edge and runs off it, like a card rising out of the page.
    <div className="absolute left-1/2 -translate-x-1/2 top-[max(0px,calc(100%-250px))] w-[min(92%,420px)] rounded-t-[18px] bg-white text-[#0B1B3F] px-5 pt-6 pb-10 shadow-[0_-10px_40px_rgba(4,16,70,0.3)]">
      <p className="text-[11.5px] font-extrabold tracking-[0.1em] text-[#1D4ED8]">EXECUTIVE PORTAL</p>
      <p className="mt-1 text-[18px] font-extrabold tracking-[-0.01em]">Your workspace</p>
      <div className="grid grid-cols-3 gap-2.5 mt-3.5">
        {tiles.map(({ icon: Icon, label }) => (
          <span key={label} className="flex flex-col gap-2 p-3 rounded-[10px] bg-[#F4F6FA]">
            <Icon className="w-[18px] h-[18px] text-[#1D4ED8]" />
            <span className="text-[12px] font-bold text-[#27324A]">{label}</span>
          </span>
        ))}
      </div>
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 py-2.5 border-t border-[#EEF2F7] text-[13px] font-bold">
            <span className="truncate">{r.name}</span>
            <span className={`shrink-0 px-2 py-[3px] rounded-full text-[11px] font-extrabold ${r.tone}`}>{r.pill}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
