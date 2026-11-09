import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Stethoscope } from "lucide-react";
import { StoreBadge } from "@/components/StoreBadges";
import { FooterCities } from "@/components/FooterCities";
import { COMPANY } from "@/lib/company";
import { partnerCities } from "@/lib/partner-cities";

// The site footer, after the user's design (the footer of the Contact / Partner exports): the brand with trust badges
// and social links; Services, Contact us + Legal and Available in; the app banner; then the providers note and
// copyright. Phones stack the brand, then two columns, then the cities in two columns.

type FooterLinkItem = { label: string; href: string };

const SERVICES: FooterLinkItem[] = [
  { label: "Find a doctor", href: "/find" },
  { label: "Book a doctor online", href: "/doctors" },
  { label: "Hospitals", href: "/hospitals" },
  { label: "Lab tests", href: "/diagnostics" },
  { label: "What we treat", href: "/what-we-treat" },
  { label: "Prices", href: "/prices" },
  { label: "Join as a doctor", href: "/signup/doctor" },
  { label: "Join as a hospital", href: "/signup/hospital" },
  { label: "Join as a diagnostic centre", href: "/signup/diagnostic-centre" },
];

const CONTACT: FooterLinkItem[] = [
  { label: "Help & Support", href: "/contact" },
  { label: "Partner With Us", href: "/corporate" },
  // No careers page yet: this writes to the company inbox.
  { label: "Work With Us", href: `mailto:${COMPANY.email}?subject=${encodeURIComponent("Working with Consult your Doctor")}` },
];

const LEGAL: FooterLinkItem[] = [
  { label: "Terms & Conditions", href: "/terms-of-use" },
  { label: "Cookie Policy", href: "/privacy-policy#cookies" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="w-full h-full">
      <defs>
        <radialGradient id="footer-ig" cx="30%" cy="107%" r="150%">
          <stop offset="0" stopColor="#FDF497" />
          <stop offset="0.05" stopColor="#FDF497" />
          <stop offset="0.45" stopColor="#FD5949" />
          <stop offset="0.6" stopColor="#D6249F" />
          <stop offset="0.9" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#footer-ig)" />
      <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16.1" cy="7.9" r="1" fill="#fff" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="w-full h-full">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="M10 8.6v6.8l5.6-3.4Z" fill="#fff" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="w-full h-full">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path d="M6.4 9.6h2.5v8H6.4Zm1.25-4a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9ZM10.5 9.6h2.4v1.1h.03c.34-.63 1.15-1.3 2.37-1.3 2.53 0 3 1.67 3 3.83v4.37h-2.5v-3.87c0-.92-.02-2.11-1.29-2.11-1.29 0-1.49 1-1.49 2.04v3.94h-2.5Z" fill="#fff" />
    </svg>
  );
}

// Each icon links to its profile once its address is filled in (lib/company.ts); until then it shows as a plain icon.
const SOCIAL = [
  { label: "Instagram", href: COMPANY.social.instagram, Icon: InstagramIcon },
  { label: "YouTube", href: COMPANY.social.youtube, Icon: YouTubeIcon },
  { label: "LinkedIn", href: COMPANY.social.linkedin, Icon: LinkedInIcon },
];

const linkCls = "flex items-center gap-2 md:gap-2.5 py-1.5 md:py-[7px] text-[13.5px] md:text-[14.5px] leading-[1.35] text-[#E8EEFC] hover:text-white transition-colors";
const headCls = "mb-2 md:mb-[18px] text-[15px] md:text-[16px] font-extrabold text-white";

function FooterLink({ item }: { item: FooterLinkItem }) {
  const body = (
    <>
      <ChevronRight className="w-[11px] h-[11px] md:w-3 md:h-3 shrink-0 text-[#B7C8F2]" strokeWidth={3} />
      <span>{item.label}</span>
    </>
  );
  return item.href.startsWith("/") ? (
    <Link href={item.href} className={linkCls}>
      {body}
    </Link>
  ) : (
    <a href={item.href} className={linkCls}>
      {body}
    </a>
  );
}

function Column({ title, items, className = "" }: { title: string; items: FooterLinkItem[]; className?: string }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className={headCls}>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <FooterLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function Footer() {
  const cities = await partnerCities().catch(() => [] as string[]);

  return (
    <footer className="relative isolate overflow-hidden bg-[#2A4DD0] text-[#E1E8FA] font-(family-name:--font-manrope) px-5 md:px-[max(24px,10%)] pt-9 md:pt-16 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-10">
      <Stethoscope aria-hidden className="absolute -z-10 -right-[70px] top-2.5 w-[260px] h-[260px] md:-right-10 md:top-10 md:w-[420px] md:h-[420px] text-white opacity-[0.08]" strokeWidth={1.6} />

      <div className="md:flex md:flex-wrap md:gap-x-10 md:gap-y-12">
        {/* The brand, trust badges and social links */}
        <div className="md:flex-[1_1_310px] md:max-w-[400px]">
          <Link href="/" aria-label="Consult your Doctor home" className="inline-flex items-center gap-3 md:gap-3.5 text-white">
            <Image src="/logo-icon-white.png" alt="" width={84} height={84} sizes="42px" className="w-[34px] h-[34px] md:w-[42px] md:h-[42px] object-contain shrink-0" />
            <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[22px] md:text-[26px] font-bold tracking-[-0.01em] whitespace-nowrap">Consult your Doctor</span>
          </Link>
          <p className="mt-3.5 md:mt-[18px] text-[14px] md:text-[15px] leading-[1.6] md:leading-[1.65]">
            Find doctors at partner hospitals and diagnostic labs, book and pay online, and keep your prescriptions and reports in one place.
          </p>
          <div className="flex gap-3 md:gap-3.5 mt-[18px] md:mt-6">
            {[
              { src: "/badge-trustpilot.svg", alt: "Trustpilot" },
              { src: "/badge-legitscript.svg", alt: "LegitScript" },
            ].map((b) => (
              <Image key={b.src} src={b.src} alt={b.alt} width={80} height={86} unoptimized className="h-[72px] md:h-[84px] w-auto object-contain select-none" />
            ))}
          </div>
          <h2 className="mt-[22px] md:mt-[26px] mb-2 md:mb-3 text-[15px] md:text-[16px] font-extrabold text-white">Social links</h2>
          <ul className="flex gap-3">
            {SOCIAL.map(({ label, href, Icon }) => (
              <li key={label}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Consult your Doctor on ${label}`}
                    className="block w-[38px] h-[38px] md:w-10 md:h-10 rounded-[10px] overflow-hidden shadow-[0_2px_6px_rgba(8,20,51,0.2)] hover:-translate-y-0.5 transition-transform"
                  >
                    <Icon />
                  </a>
                ) : (
                  <span role="img" aria-label={label} className="block w-[38px] h-[38px] md:w-10 md:h-10 rounded-[10px] overflow-hidden shadow-[0_2px_6px_rgba(8,20,51,0.2)]">
                    <Icon />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Phones: two columns under a hairline. Desktops: these sit in the row beside the brand. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 mt-7 pt-[26px] border-t border-white/[0.22] md:contents">
          <Column title="Services" items={SERVICES} className="min-w-0 md:flex-[1_1_190px]" />
          <div className="min-w-0 md:flex-[1_1_170px]">
            <Column title="Contact us" items={CONTACT} />
            <Column title="Legal" items={LEGAL} className="mt-[22px] md:mt-[34px]" />
          </div>
          {cities.length > 0 && (
            <nav aria-label="Available in" className="col-span-2 min-w-0 md:flex-[1_1_130px]">
              <h2 className={headCls}>Available in</h2>
              <FooterCities cities={cities} linkClass={linkCls} />
            </nav>
          )}
        </div>
      </div>

      {/* The app banner */}
      <div className="mt-7 md:mt-11 pt-6 md:py-[26px] border-t border-white/[0.22] md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-8 md:gap-y-[18px]">
        <p className="text-[18px] md:text-[22px] leading-[1.3] font-extrabold tracking-[-0.01em] text-white">For a better experience, download the Consult your Doctor app</p>
        <div className="flex gap-2.5 md:gap-3.5 mt-3.5 md:mt-0 [&>*]:flex-1 md:[&>*]:flex-none [&>*>*]:w-full [&>*>*]:justify-center">
          <span>
            <StoreBadge store="apple" />
          </span>
          <span>
            <StoreBadge store="google" />
          </span>
        </div>
      </div>

      {/* Providers note and copyright */}
      <div className="mt-6 md:mt-2 pt-5 md:pt-6 border-t border-white/10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-10 text-[12px] md:text-[12.5px] leading-relaxed text-white/70">
        <p className="max-w-3xl">
          Consult your Doctor is a healthcare technology platform. Your care is provided by the independent doctors, hospitals and diagnostic centres you book; we
          provide booking, payments and your digital records. In an emergency, call 108.{" "}
          <Link href="/terms-of-use" className="font-semibold text-white underline underline-offset-2 hover:text-white/90">
            How we work with providers
          </Link>
          {" · "}
          <Link href="/legal" className="font-semibold text-white underline underline-offset-2 hover:text-white/90">
            All legal documents
          </Link>
        </p>
        <p className="shrink-0">&copy; {new Date().getFullYear()} Zebrold International Holdings Pvt Ltd. All rights reserved.</p>
      </div>
    </footer>
  );
}
