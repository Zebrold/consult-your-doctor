import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BriefcaseBusiness, Building2, FlaskConical, Plus, Stethoscope, type LucideIcon } from 'lucide-react'
import { AuthBack } from './AuthBack'

// The login pages, after the user's login design: a blue header with a back arrow, the page's name in capitals, one
// line under it and a clipboard picture on the right, then the form on white with underlined fields, a full-width
// button, "OR" and Google. Phones get it edge to edge; wider screens get the same thing as a card in the middle of a
// pale page, with the brand above it.

export type AuthArt = 'patient' | 'doctor' | 'hospital' | 'lab' | 'executive'

/** The small capital label over a field, e.g. "PHONE NUMBER". */
export const authLabel = 'block text-[12.5px] font-bold tracking-[0.07em] uppercase text-[#5B667A]'
/** The red mark after a required field's label. */
export const authRequired = <span aria-hidden className="text-[#D92D20]"> *</span>
/** An underlined field, the only line under it turning blue while typing. */
export const authField =
  'w-full h-[50px] px-0.5 bg-transparent border-0 border-b-2 border-[#D5DCE8] rounded-none text-[17px] font-semibold text-[#0B1B3F] placeholder:font-normal placeholder:text-[#A3ADBF] outline-none transition-colors focus:border-[#2A4DD0] disabled:opacity-60'
export const authHelp = 'mt-2 text-[13px] leading-[1.5] text-[#5B667A]'
/** The full-width blue button, in capitals: "CONTINUE". */
export const authButton =
  'w-full h-[54px] px-6 rounded-[12px] bg-[#2A4DD0] hover:bg-[#2442BA] text-white text-[16px] font-extrabold uppercase tracking-[0.06em] flex items-center justify-center gap-2 shadow-[0_10px_22px_-10px_rgba(42,77,208,0.75)] transition-colors active:scale-[0.99] disabled:opacity-60 disabled:shadow-none'
/** The white outlined button: "Continue with Google". */
export const authButtonOutline =
  'w-full h-[54px] px-5 rounded-[12px] bg-white hover:bg-[#F7F9FC] border border-[#D5DCE8] text-[#0B1B3F] text-[16px] font-semibold flex items-center justify-center gap-3 transition-colors active:scale-[0.99] disabled:opacity-60 cursor-pointer'
export const authLink = 'font-extrabold text-[#2A4DD0] hover:underline underline-offset-4'
export const authError = 'p-3 rounded-[10px] bg-[#FEF3F2] text-[#B42318] text-[13.5px] font-semibold'
/** The lines under the form: other logins, help. */
export const authFooter = 'mt-8 pt-6 border-t border-[#EEF1F6] space-y-2 text-center text-[14px] text-[#5B667A]'

/** "OR" between the main button and Google. */
export function AuthOr() {
  return (
    <div aria-hidden className="flex items-center gap-4 my-6">
      <span className="flex-1 h-px bg-[#DDE3EC]" />
      <span className="text-[14px] font-semibold tracking-[0.06em] text-[#7A8599]">OR</span>
      <span className="flex-1 h-px bg-[#DDE3EC]" />
    </div>
  )
}

/** "By continuing, I accept the Terms & Conditions & Privacy Policy", under the buttons. */
export function AuthTerms({ verb = 'continuing' }: { verb?: string }) {
  const link = 'font-extrabold text-[#0B1B3F] hover:text-[#2A4DD0] hover:underline underline-offset-2'
  return (
    <p className="mt-6 text-center text-[13.5px] leading-[1.6] text-[#5B667A]">
      By {verb}, I accept the{' '}
      <Link className={link} href="/terms-of-use">
        Terms &amp; Conditions
      </Link>{' '}
      &amp;{' '}
      <Link className={link} href="/privacy-policy">
        Privacy Policy
      </Link>
    </p>
  )
}

/** A line under the card, e.g. "New to Consult your Doctor? Create an account". */
export function AuthCorner({ lead, label, href, onClick }: { lead: string; label: string; href?: string; onClick?: () => void }) {
  return (
    <>
      <span className="text-[#5B667A]">{lead}</span>{' '}
      {href ? (
        <Link href={href} className={authLink}>
          {label}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={authLink}>
          {label}
        </button>
      ) : (
        <span className="font-extrabold text-[#0B1B3F]">{label}</span>
      )}
    </>
  )
}

export function AuthShell({
  title,
  subtitle,
  art,
  backHref = '/',
  corner,
  footer,
  children,
}: {
  /** The page's name, shown in capitals: "Login", "Doctor login". */
  title: string
  subtitle: string
  art: AuthArt
  /** Where the back arrow goes when there is no page to go back to. */
  backHref?: string
  /** A line under the form, e.g. how to create an account. */
  corner?: ReactNode
  /** The lines at the foot, under a rule: other logins, help. */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="w-full min-h-[calc(100dvh-var(--strip-h))] bg-white sm:bg-[#EEF2FA] sm:flex sm:flex-col sm:items-center sm:justify-center sm:px-6 sm:py-10 font-(family-name:--font-manrope) text-[#0B1B3F]">
      <Link href="/" aria-label="Consult your Doctor home" className="hidden sm:inline-flex items-center gap-2.5 mb-6 text-[#0B1B3F]">
        <Image src="/logo-icon.png" alt="" width={72} height={72} priority className="w-8 h-8 object-contain" />
        <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[21px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
      </Link>

      <div className="w-full sm:max-w-[460px] sm:rounded-[24px] sm:overflow-hidden bg-white sm:shadow-[0_30px_70px_-30px_rgba(11,27,63,0.35),0_0_0_1px_rgba(11,27,63,0.04)]">
        <header className="relative isolate overflow-hidden bg-[linear-gradient(160deg,#3A5FEA_0%,#2A4DD0_48%,#2342B8_100%)] text-white px-5 sm:px-8 pt-4 sm:pt-6 pb-8 min-h-[196px] sm:min-h-[210px]">
          {/* A faint dot grid, and the soft circle behind the picture */}
          <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1.3px)] [background-size:20px_20px] [mask-image:linear-gradient(to_right,transparent_35%,#000_100%)]" />
          <AuthBack fallback={backHref} />
          <div className="relative z-10 mt-7 sm:mt-8 pr-[128px] sm:pr-[150px]">
            <h1 className="text-[30px] sm:text-[32px] leading-[1.1] font-extrabold uppercase tracking-[0.01em]">{title}</h1>
            <p className="mt-2 text-[15px] sm:text-[15.5px] leading-[1.45] text-[#DCE6FF]">{subtitle}</p>
          </div>
          <AuthPicture art={art} />
        </header>

        <div className="px-5 sm:px-8 pt-8 pb-10">
          {children}
          {corner && <p className="mt-7 text-center text-[14.5px]">{corner}</p>}
          {footer && <div className={authFooter}>{footer}</div>}
        </div>
      </div>
    </div>
  )
}

const ICON: Record<AuthArt, LucideIcon> = { patient: Plus, doctor: Stethoscope, hospital: Building2, lab: FlaskConical, executive: BriefcaseBusiness }

/** A clipboard with the portal's sign on it, leaning on a soft circle and running off the header's bottom edge. */
function AuthPicture({ art }: { art: AuthArt }) {
  const Icon = ICON[art]
  return (
    <span aria-hidden className="absolute right-3 sm:right-6 -bottom-6 w-[150px] h-[170px]">
      <span className="absolute left-1/2 top-[22px] -translate-x-1/2 w-[146px] h-[146px] rounded-full bg-white/[0.12]" />
      <span className="absolute left-1/2 top-[6px] -translate-x-1/2 rotate-[7deg] w-[98px] h-[150px]">
        {/* The board */}
        <span className="absolute inset-0 rounded-[14px] bg-[#F3F6FF] shadow-[0_18px_30px_-8px_rgba(6,20,80,0.55),inset_0_0_0_3px_#FFFFFF]" />
        {/* The clip, with its ring */}
        <span className="absolute left-1/2 -top-[9px] -translate-x-1/2 w-[44px] h-[20px] rounded-[7px] bg-[#C7D3FF] shadow-[inset_0_-2px_0_rgba(42,77,208,0.18)]" />
        <span className="absolute left-1/2 -top-[17px] -translate-x-1/2 w-[16px] h-[16px] rounded-full bg-[#C7D3FF] shadow-[inset_0_0_0_4px_#AFC0FF]" />
        {/* The sign */}
        <span className="absolute left-1/2 top-[30px] -translate-x-1/2 w-[42px] h-[42px] rounded-full bg-[#2A4DD0] text-white flex items-center justify-center shadow-[0_6px_12px_-4px_rgba(42,77,208,0.7)]">
          <Icon className="w-[22px] h-[22px]" strokeWidth={art === 'patient' ? 3.2 : 2.3} />
        </span>
        {/* Lines of writing */}
        <span className="absolute left-[16px] right-[16px] top-[88px] h-[7px] rounded-full bg-[#D3DDFF]" />
        <span className="absolute left-[16px] right-[22px] top-[102px] h-[7px] rounded-full bg-[#9FB3FF]" />
        <span className="absolute left-[16px] right-[30px] top-[116px] h-[7px] rounded-full bg-[#D3DDFF]" />
      </span>
    </span>
  )
}
