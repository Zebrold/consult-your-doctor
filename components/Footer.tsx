import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StoreBadges } from "@/components/StoreBadges";
import { COMPANY } from "@/lib/company";

// The home page's footer: the brand with trust badges and social links, the 2 navigation columns (Contact us, Legal),
// and the app badges.

type FooterLinkItem = { label: string; href: string };

const CONTACT: FooterLinkItem[] = [
  { label: "Help & Support", href: "/contact" },
  { label: "Help & FAQ", href: "/faq" },
  { label: "Partner With Us", href: "/corporate" },
];

const LEGAL: FooterLinkItem[] = [
  { label: "Terms & Conditions", href: "/terms-of-use" },
  { label: "Cookie Policy", href: "/privacy-policy#cookies" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "All legal documents", href: "/legal" },
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

const SOCIAL = [
  { label: "Instagram", href: COMPANY.social.instagram, Icon: InstagramIcon },
  { label: "YouTube", href: COMPANY.social.youtube, Icon: YouTubeIcon },
  { label: "LinkedIn", href: COMPANY.social.linkedin, Icon: LinkedInIcon },
].filter((s) => s.href);

const linkCls = "group inline-flex items-start gap-2 text-[14px] md:text-[14.5px] leading-6 text-white/85 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline";

function FooterLink({ item }: { item: FooterLinkItem }) {
  const body = (
    <>
      <ChevronRight className="w-3.5 h-3.5 mt-[5px] shrink-0 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-transform" strokeWidth={2.4} />
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
      <h2 className="text-[16px] md:text-[17px] font-extrabold tracking-[-0.01em] text-white">{title}</h2>
      <ul className="mt-4 md:mt-5 flex flex-col gap-2 md:gap-2.5">
        {items.map((item) => (
          <li key={item.label}>
            <FooterLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[#2A4DD0] text-white font-(family-name:--font-manrope)">
      <div className="max-w-[1360px] mx-auto px-5 md:px-8 lg:px-12 pt-12 md:pt-16 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-10">
        {/* Brand + 2 Nav Columns (Contact us, Legal) */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-6 flex flex-col justify-between pr-0 lg:pr-8">
            <div>
              <Link
                href="/"
                aria-label="Consult your Doctor home"
                className="inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
              >
                <Image src="/logo-icon-white.png" alt="" width={44} height={44} className="w-10 h-10 md:w-11 md:h-11 object-contain shrink-0" />
                <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[24px] md:text-[27px] font-bold tracking-[-0.01em] whitespace-nowrap text-white">
                  Consult your Doctor
                </span>
              </Link>
              <p className="mt-4 max-w-[420px] text-[14px] md:text-[15px] leading-[1.65] text-white/80">
                Find doctors at partner hospitals and diagnostic labs, book and pay online, and keep your prescriptions and reports in one place.
              </p>
              <div className="mt-6 flex items-center gap-4">
                {[
                  { src: "/badge-trustpilot.svg", alt: "Trustpilot" },
                  { src: "/badge-legitscript.svg", alt: "LegitScript" },
                ].map((b) => (
                  <div key={b.src} className="h-16 md:h-[72px] flex items-center">
                    <Image src={b.src} alt={b.alt} width={80} height={86} unoptimized className="h-16 md:h-[72px] w-auto object-contain select-none" />
                  </div>
                ))}
              </div>
            </div>
            {SOCIAL.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[13px] font-bold tracking-wide uppercase text-white/70">Follow us</h3>
                <ul className="mt-3 flex items-center gap-3">
                  {SOCIAL.map(({ label, href, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Consult your Doctor on ${label}`}
                        className="block w-10 h-10 rounded-[10px] shadow-[0_4px_12px_rgba(5,20,80,0.2)] hover:-translate-y-0.5 transition-transform"
                      >
                        <Icon />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 1. Contact us */}
          <Column title="Contact us" items={CONTACT} className="col-span-1 lg:col-span-3" />

          {/* 2. Legal */}
          <Column title="Legal" items={LEGAL} className="col-span-1 lg:col-span-3" />
        </div>

        {/* The app banner */}
        <div className="mt-11 pt-8 border-t border-white/15 flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-8">
          <p className="text-[18px] md:text-[22px] leading-[1.3] font-extrabold tracking-[-0.02em] text-balance">
            For a better experience, download the Consult your Doctor app
          </p>
          <StoreBadges className="shrink-0" />
        </div>

        {/* Subfooter */}
        <div className="mt-7 pt-6 border-t border-white/10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-10 text-[12px] md:text-[12.5px] leading-relaxed text-white/70">
          <p className="max-w-3xl">
            Consult your Doctor is a healthcare technology platform. Your care is provided by the independent doctors, hospitals and diagnostic centres you book; we
            provide booking, payments and your digital records. In an emergency, call 108.{" "}
            <Link href="/terms-of-use" className="font-semibold text-white underline underline-offset-2 hover:text-white/90">
              How we work with providers
            </Link>
          </p>
          <p className="shrink-0">&copy; {new Date().getFullYear()} Zebrold International Holdings Pvt Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
