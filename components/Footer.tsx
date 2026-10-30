import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StoreBadges } from "@/components/StoreBadges";
import { COMPANY } from "@/lib/company";
import { formatCityName } from "@/lib/geo";

// The home page's footer: the brand with the trust badges and social links, the logins,
// Contact us, Legal, the cities with partner hospitals and labs, and the app badges.

type FooterLinkItem = { label: string; href: string };

const LOGINS: FooterLinkItem[] = [
  { label: "Patient login", href: "/login/patient" },
  { label: "Doctor login", href: "/login/doctor" },
  { label: "Hospital login", href: "/login/hospital" },
  { label: "Diagnostic centre login", href: "/login/diagnostic" },
];

const CONTACT: FooterLinkItem[] = [
  { label: "Help & Support", href: "/contact" },
  { label: "Partner With Us", href: "/corporate" },
];

const LEGAL: FooterLinkItem[] = [
  { label: "Terms & Conditions", href: "/terms-of-use" },
  { label: "Cookie Policy", href: "/privacy-policy#cookies" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "All legal documents", href: "/legal" },
];

const CITIES_SHOWN = 6;

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

const linkCls = "group inline-flex items-start gap-2.5 text-[14.5px] md:text-[15px] leading-6 text-white/90 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline";

function FooterLink({ item }: { item: FooterLinkItem }) {
  const body = (
    <>
      <ChevronRight className="w-3.5 h-3.5 mt-[5px] shrink-0 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-transform" strokeWidth={2.4} />
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
      <h2 className="text-[16.5px] md:text-[17px] font-extrabold tracking-[-0.01em] text-white">{title}</h2>
      <ul className="mt-4 md:mt-5 flex flex-col gap-2.5 md:gap-3">
        {items.map((item) => (
          <li key={item.label}>
            <FooterLink item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** `cities` are the cities with partner hospitals or labs, in the order to show them. */
export function Footer({ cities = [] }: { cities?: string[] }) {
  const normalizedCities = Array.from(new Set(cities.map(formatCityName).filter(Boolean))).sort();
  const cityLink = (city: string): FooterLinkItem => ({ label: city, href: `/find?city=${encodeURIComponent(city)}` });
  const shown = normalizedCities.slice(0, CITIES_SHOWN);
  const more = normalizedCities.slice(CITIES_SHOWN);

  return (
    <footer className="relative isolate overflow-hidden bg-[#2A4DD0] text-white font-(family-name:--font-manrope)">
      <div className="px-4 md:px-[max(24px,8%)] pt-11 md:pt-16 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-x-6 md:gap-x-8 gap-y-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:pr-6">
            <Link href="/" aria-label="Consult your Doctor home" className="inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg">
              <Image src="/logo-icon-white.png" alt="" width={96} height={96} className="w-10 h-10 md:w-[46px] md:h-[46px] object-contain" />
              <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[24px] md:text-[28px] font-bold tracking-[-0.01em]">Consult your Doctor</span>
            </Link>
            <p className="mt-4 md:mt-5 max-w-[400px] text-[14.5px] md:text-[15.5px] leading-[1.65] text-white/85">
              Find doctors at partner hospitals and diagnostic labs, book and pay online, and keep your prescriptions and reports in one place.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {[
                { src: "/badge-trustpilot.svg", alt: "Trustpilot" },
                { src: "/badge-legitscript.svg", alt: "LegitScript" },
              ].map((b) => (
                <div key={b.src} className="h-[52px] flex items-center">
                  <Image src={b.src} alt={b.alt} width={80} height={86} unoptimized className="h-[52px] w-auto object-contain select-none" />
                </div>
              ))}
            </div>
            {SOCIAL.length > 0 && (
              <div className="mt-7">
                <h2 className="text-[16.5px] md:text-[17px] font-extrabold tracking-[-0.01em]">Social links</h2>
                <ul className="mt-3.5 flex items-center gap-3">
                  {SOCIAL.map(({ label, href, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Consult your Doctor on ${label}`}
                        className="block w-11 h-11 rounded-[12px] shadow-[0_6px_14px_rgba(5,20,80,0.25)] hover:-translate-y-0.5 transition-transform"
                      >
                        <Icon />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 1. Login */}
          <Column title="Login" items={LOGINS} />

          {/* 2. Contact us */}
          <Column title="Contact us" items={CONTACT} />

          {/* 3. Legal */}
          <Column title="Legal" items={LEGAL} />

          {/* 4. Available in */}
          {normalizedCities.length > 0 && (
            <nav aria-label="Available in" className="col-span-2 sm:col-span-1">
              <h2 className="text-[16.5px] md:text-[17px] font-extrabold tracking-[-0.01em] text-white">Available in</h2>
              <ul className="mt-4 md:mt-5 flex flex-col gap-2.5 md:gap-3">
                {shown.map((city) => (
                  <li key={city} className="min-w-0">
                    <FooterLink item={cityLink(city)} />
                  </li>
                ))}
              </ul>
              {more.length > 0 && (
                <details className="group mt-4 md:mt-5">
                  <summary className="inline-flex items-center gap-2 h-9 px-3.5 rounded-[10px] border border-white/45 text-[14px] font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-white/10 transition-colors">
                    <span className="group-open:hidden">More cities</span>
                    <span className="hidden group-open:inline">Fewer cities</span>
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" strokeWidth={2.4} />
                  </summary>
                  <ul className="mt-3 flex flex-col gap-2.5 md:gap-3">
                    {more.map((city) => (
                      <li key={city} className="min-w-0">
                        <FooterLink item={cityLink(city)} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </nav>
          )}
        </div>

        {/* The app */}
        <div className="mt-11 md:mt-14 pt-8 md:pt-9 border-t border-white/20 flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-8">
          <p className="text-[19px] md:text-[24px] leading-[1.3] font-extrabold tracking-[-0.02em] text-balance">For a better experience, download the Consult your Doctor app</p>
          <StoreBadges className="shrink-0" />
        </div>

        <div className="mt-8 md:mt-9 pt-6 border-t border-white/15 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-10 text-[12px] md:text-[12.5px] leading-relaxed text-white/70">
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
