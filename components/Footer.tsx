import Link from "next/link";
import Image from "next/image";
import { BriefcaseBusiness, ChevronRight, FlaskConical, Hospital, Stethoscope, UserRound } from "lucide-react";

const ourServices = [
  { label: "Find a doctor", href: "/doctors" },
  { label: "Book a doctor online", href: "/online-doctor" },
  { label: "Hospitals", href: "/hospitals" },
  { label: "Lab tests", href: "/diagnostics" },
  { label: "What we treat", href: "/what-we-treat" },
  { label: "Prices", href: "/prices" },
  { label: "Join as a doctor", href: "/signup/doctor" },
  { label: "Join as a hospital", href: "/signup/hospital" },
  { label: "Join as a diagnostic centre", href: "/signup/diagnostic-centre" },
];

const portalLogins = [
  { label: "Patients", href: "/login/patient", icon: UserRound },
  { label: "Doctors", href: "/login/doctor", icon: Stethoscope },
  { label: "Hospitals", href: "/login/hospital", icon: Hospital },
  { label: "Diagnostic centres", href: "/login/diagnostic", icon: FlaskConical },
  { label: "Front desk", href: "/login/executive", icon: BriefcaseBusiness },
];

const companyLinks = [
  { label: "About us", href: "/about" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Help and FAQ", href: "/how-it-works#faq" },
  { label: "Sign in", logins: portalLogins },
  { label: "Contact us", href: "/contact" },
];

// The website terms, the most-read signed policies (lib/legal-docs), and the full set at /legal.
const legalLinks = [
  { label: "Terms of use", href: "/terms-of-use" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Privacy notice & consent", href: "/legal/privacy-notice-and-consent-forms" },
  { label: "AI use policy", href: "/legal/ai-use-policy" },
  { label: "Telemedicine standards", href: "/legal/telemedicine-standard-operating-procedure" },
  { label: "Data retention", href: "/legal/data-retention-and-deletion-policy" },
  { label: "All legal documents", href: "/legal", strong: true },
];

export function Footer() {
  return (
    <footer className="relative w-full overflow-hidden text-white bg-gradient-to-br from-[#0052d4] via-[#005ef5] to-[#0048cb]">
      {/* Background Wave Ripple Accents (Matching Image 2) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {/* Left Circular Wave Arcs */}
        <svg
          className="absolute -left-24 -bottom-24 w-[520px] h-[520px] opacity-25"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="400" r="220" stroke="white" strokeWidth="2" opacity="0.6" />
          <circle cx="100" cy="400" r="320" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <circle cx="100" cy="400" r="420" stroke="white" strokeWidth="1" opacity="0.25" />
          <path
            d="M-50 450 C 80 320, 180 180, 260 0"
            stroke="white"
            strokeWidth="3"
            opacity="0.35"
          />
        </svg>

        {/* Right Circular Wave Arcs */}
        <svg
          className="absolute -right-20 -bottom-20 w-[550px] h-[550px] opacity-25"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="400" cy="400" r="240" stroke="white" strokeWidth="2" opacity="0.6" />
          <circle cx="400" cy="400" r="340" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <circle cx="400" cy="400" r="440" stroke="white" strokeWidth="1" opacity="0.25" />
          <path
            d="M550 450 C 420 320, 320 180, 240 0"
            stroke="white"
            strokeWidth="3"
            opacity="0.35"
          />
        </svg>

        {/* Watermark Logo Icon on Far Right */}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.14] w-[340px] h-[340px] hidden md:block">
          <Image
            src="/logo-icon-white.png"
            alt=""
            width={340}
            height={340}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      </div>

      <div className="relative max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-10 md:pt-14 pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-8">
        {/* Main 3-Column Section */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-8 lg:gap-10 items-start">
          {/* Column 1: Brand & Badges */}
          <div className="col-span-2 lg:col-span-4 flex flex-col justify-between pr-0 lg:pr-6">
            <div>
              {/* Logo */}
              <Link
                href="/"
                className="inline-flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
                aria-label="Consult your Doctor home"
              >
                <Image
                  src="/logo-icon-white.png"
                  alt="Consult your Doctor logo"
                  width={42}
                  height={42}
                  className="w-10 h-10 object-contain drop-shadow transition-transform"
                  priority
                />
                <span className="font-bold text-2xl md:text-[27px] tracking-tight text-white drop-shadow-sm">
                  Consult your Doctor
                </span>
              </Link>

              {/* Bio paragraph */}
              <p className="mt-4 text-[13.5px] sm:text-[14px] leading-relaxed text-white/85 max-w-md font-normal">
                Find doctors at partner hospitals and diagnostic labs, book and pay online, and keep your prescriptions and reports in one place.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 mt-7 pt-1">
              <div
                className="transition-transform filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                title="People love us on Trustpilot"
              >
                <Image
                  src="/badge-trustpilot.svg"
                  unoptimized
                  alt="People love us on Trustpilot"
                  width={80}
                  height={86}
                  className="h-16 md:h-[78px] w-auto object-contain select-none"
                />
              </div>
              <div
                className="transition-transform filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                title="LegitScript Certified"
              >
                <Image
                  src="/badge-legitscript.svg"
                  unoptimized
                  alt="LegitScript Certified"
                  width={80}
                  height={86}
                  className="h-16 md:h-[78px] w-auto object-contain select-none"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Our Services */}
          <div className="lg:col-span-3 lg:border-l lg:border-white/20 lg:pl-8">
            <h3 className="font-bold text-white text-[16.5px] tracking-wide mb-4 flex items-center">
              Services
            </h3>
            <ul className="flex flex-col md:space-y-2 text-[14px] md:text-[13.5px]">
              {ourServices.map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="group inline-flex items-center gap-2 py-2 md:py-0 text-white/85 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
                    <span>{service.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="lg:col-span-2 lg:border-l lg:border-white/20 lg:pl-8">
            <h3 className="font-bold text-white text-[16.5px] tracking-wide mb-4 flex items-center">
              Company
            </h3>
            <ul className="flex flex-col md:space-y-2 text-[14px] md:text-[13.5px]">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  {item.logins ? (
                    <details className="group/logins">
                      <summary className="group inline-flex items-center gap-2 py-2 md:py-0 text-white/85 hover:text-white transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:underline">
                        <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-transform shrink-0 group-open/logins:rotate-90" />
                        <span>{item.label}</span>
                      </summary>
                      <ul className="md:mt-2 ml-[6px] pl-4 border-l border-white/25 flex flex-col md:space-y-2">
                        {item.logins.map(({ label, href, icon: Icon }) => (
                          <li key={href}>
                            <Link
                              href={href}
                              className="inline-flex items-center gap-2 py-2 md:py-0 text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline"
                            >
                              <Icon className="w-3.5 h-3.5 text-white/70 shrink-0" />
                              <span>{label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <Link
                      href={item.href}
                      className="group inline-flex items-center gap-2 py-2 md:py-0 text-white/85 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="col-span-2 lg:col-span-3 lg:border-l lg:border-white/20 lg:pl-8">
            <h3 className="font-bold text-white text-[16.5px] tracking-wide mb-4 flex items-center">
              Legal
            </h3>
            <ul className="grid grid-cols-2 lg:grid-cols-1 gap-x-6 md:gap-y-2 text-[14px] md:text-[13.5px]">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group inline-flex items-center gap-2 py-2 md:py-0 hover:text-white transition-colors focus-visible:outline-none focus-visible:underline ${item.strong ? "text-white font-semibold" : "text-white/85"}`}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <div className="w-full h-[1px] bg-white/20 my-8" />

        {/* Bottom Subfooter Section */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* Disclaimer text */}
          <p className="text-[11.5px] sm:text-[12px] leading-relaxed text-white/70 max-w-5xl text-center">
            Consult Your Doctor is a healthcare technology platform. Your care is provided by the independent doctors, hospitals and diagnostic centres you book; we provide booking, payments and your digital records. In an emergency, call 108. Read about the{" "}
            <Link
              href="/terms-of-use"
              className="text-white font-semibold underline underline-offset-2 hover:text-white/90 focus-visible:outline-none"
            >
              relationship between Consult Your Doctor and the medical providers
            </Link>
            .
          </p>
        </div>

        {/* Copyright */}
        <p className="mt-6 pt-5 border-t border-white/15 text-center text-[12px] sm:text-[12.5px] text-white/75">
          &copy; {new Date().getFullYear()} Zebrold International Holdings Pvt Ltd. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
