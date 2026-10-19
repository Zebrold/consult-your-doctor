import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bot, PhoneCall } from "lucide-react";

// The app's footer, in the blue of the app header, at the bottom of every patient page and every staff portal: the
// legal and help links, an action, and the copyright. It reaches the bottom of the screen, so the floating navigation
// pill sits over the blue (pb-dock); the page above it keeps only its normal bottom padding.

type FooterLink = { href: string; label: string; wide?: boolean };

const actionClass =
  "inline-flex items-center gap-2 font-bold text-[16px] md:text-[15px] md:h-11 md:px-5 md:rounded-full md:bg-white md:text-vibrant-blue md:shadow-sm md:hover:bg-white/90 transition-colors shrink-0";

function BlueFooter({ homeHref, links, action, note }: { homeHref: string; links: FooterLink[]; action: ReactNode; note: string }) {
  return (
    <footer className="relative overflow-hidden rounded-t-[32px] md:rounded-t-[44px] bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white shadow-[0_-14px_30px_-18px_rgba(0,80,220,0.55)] print:hidden">
      <span aria-hidden className="absolute -right-24 -top-28 w-72 h-72 md:w-[26rem] md:h-[26rem] md:-top-52 rounded-full bg-white/[0.07]" />
      <span aria-hidden className="absolute -left-20 bottom-0 w-56 h-56 md:w-80 md:h-80 rounded-full bg-white/[0.05]" />

      <div className="relative max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-7 md:pt-10 pb-dock">
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 md:gap-8">
          <Link href={homeHref} aria-label="Consult your Doctor home" className="hidden md:flex items-center gap-3 shrink-0">
            <Image src="/logo-icon-white.png" alt="" width={96} height={96} sizes="44px" className="w-11 h-11 object-contain" />
            <span className="leading-tight">
              <span className="block font-title-md text-[20px] font-extrabold tracking-tight">Consult your Doctor</span>
              <span className="block text-[13px] text-white/80">Your Health, Our Priority</span>
            </span>
          </Link>

          <nav aria-label="Legal and help" className="flex flex-wrap items-center justify-center text-[13px] min-[400px]:text-[14px] md:text-[14.5px] text-white/90">
            {links.map((link, i) => (
              <Fragment key={link.href}>
                <span className={link.wide ? "hidden md:contents" : "contents"}>
                  {i > 0 && <span aria-hidden className="w-px h-4 bg-white/35 mx-2 min-[400px]:mx-3 md:mx-4" />}
                  <Link href={link.href} className="py-1.5 whitespace-nowrap hover:text-white hover:underline underline-offset-4">
                    {link.label}
                  </Link>
                </span>
              </Fragment>
            ))}
          </nav>

          {action}
        </div>

        <div className="mt-3 md:mt-8 md:pt-6 md:border-t md:border-white/20 flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-6 text-center md:text-left">
          <p className="text-[13px] md:text-[13.5px] text-white/80">
            &copy; 2026 Zebrold International Holdings Pvt Ltd.<span className="hidden md:inline"> All rights reserved.</span>
          </p>
          <p className="hidden md:block text-[13px] text-white/70 max-w-xl md:text-right">{note}</p>
        </div>
      </div>
    </footer>
  );
}

/** The footer of every patient page. */
export function PatientFooter({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <BlueFooter
      homeHref="/"
      links={[
        { href: "/terms-of-use", label: "Terms & Conditions" },
        { href: "/privacy-policy", label: "Privacy Policy" },
        // Support needs an account; visitors get the public FAQ.
        { href: isSignedIn ? "/patient/support" : "/how-it-works#faq", label: "Help & FAQs" },
        { href: "/legal", label: "Legal documents", wide: true },
      ]}
      action={
        <a href="tel:108" className={actionClass}>
          <PhoneCall className="hidden md:block w-4 h-4" />
          Emergency: Call 108
        </a>
      }
      note="Your care is provided by the independent doctors, hospitals and diagnostic centres you book."
    />
  );
}

const PORTAL_HOME = { doctor: "/doctor", hospital: "/hospital", lab: "/diagnostic-center", executive: "/executive" } as const;

/**
 * The footer of the doctor, hospital, diagnostic centre and executive portals. Staff accounts can open the legal pages
 * but nothing else outside their portal, so help is the portal's own Zebrold AI page.
 */
export function PortalFooter({ portal }: { portal: keyof typeof PORTAL_HOME }) {
  const home = PORTAL_HOME[portal];
  return (
    <BlueFooter
      homeHref={`${home}/dashboard`}
      links={[
        { href: "/terms-of-use", label: "Terms & Conditions" },
        { href: "/privacy-policy", label: "Privacy Policy" },
        { href: "/legal", label: "Legal documents" },
      ]}
      action={
        <Link href={`${home}/ai`} className={actionClass}>
          <Bot className="hidden md:block w-4 h-4" />
          Help: Ask Zebrold AI
        </Link>
      }
      note="Consult Your Doctor partner portal for doctors, hospitals and diagnostic centres."
    />
  );
}
