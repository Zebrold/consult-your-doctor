import Link from "next/link";
import Image from "next/image";
import { BriefcaseBusiness, ChevronRight, FlaskConical, Hospital, LogIn, Stethoscope } from "lucide-react";

const ourServices = [
  { label: "Find a Doctor Near Me", href: "/search?type=doctor" },
  { label: "Urgent Care Near Me", href: "/search?type=hospital" },
  { label: "Online Doctor Consultation", href: "/online-doctor" },
  { label: "Lab Tests", href: "/search?type=diagnostic" },
  { label: "Surgeries", href: "/search?type=hospital" },
  { label: "What We Treat", href: "/what-we-treat" },
  { label: "Consult Your Doctor Pro", href: "/prices" },
  { label: "Work With Us", href: "/signup/doctor" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Patient Stories", href: "/how-it-works#stories" },
  { label: "Locations", href: "/search?type=hospital" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Help | FAQ", href: "/how-it-works#faq" },
  { label: "Security & Privacy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-of-use" },
  { label: "Contact Us", href: "/contact" },
];

const staffLogins = [
  { label: "Doctor Login", href: "/login/doctor", icon: Stethoscope },
  { label: "Hospital Login", href: "/login/hospital", icon: Hospital },
  { label: "Diagnostic Center Login", href: "/login/diagnostic", icon: FlaskConical },
  { label: "Executive Login", href: "/login/executive", icon: BriefcaseBusiness },
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

      <div className="relative max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop pt-14 pb-8">
        {/* Main 3-Column Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Column 1: Brand & Badges */}
          <div className="sm:col-span-2 lg:col-span-5 flex flex-col justify-between pr-0 lg:pr-6">
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
                  className="w-10 h-10 object-contain drop-shadow transition-transform group-hover:scale-105"
                  priority
                />
                <span className="font-bold text-2xl md:text-[27px] tracking-tight text-white drop-shadow-sm">
                  Consult your Doctor
                </span>
              </Link>

              {/* Bio paragraph */}
              <p className="mt-4 text-[13.5px] sm:text-[14px] leading-relaxed text-white/85 max-w-md font-normal">
                Consult Your Doctor connects you with verified and licensed doctors online, anytime, anywhere, so you can quickly get trusted medical guidance and take care of your health with confidence.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-4 mt-7 pt-1">
              <div
                className="transition-transform hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                title="People love us on Trustpilot"
              >
                <Image
                  src="/badge-trustpilot.svg"
                  unoptimized
                  alt="People love us on Trustpilot"
                  width={80}
                  height={86}
                  className="h-[78px] w-auto object-contain select-none"
                />
              </div>
              <div
                className="transition-transform hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                title="LegitScript Certified"
              >
                <Image
                  src="/badge-legitscript.svg"
                  unoptimized
                  alt="LegitScript Certified"
                  width={80}
                  height={86}
                  className="h-[78px] w-auto object-contain select-none"
                />
              </div>
            </div>
          </div>

          {/* Divider between Col 1 & Col 2 on Desktop */}
          <div className="hidden lg:block lg:col-span-1 h-full flex justify-center py-2" aria-hidden="true">
            <div className="w-[1px] h-full min-h-[260px] bg-white/20 mx-auto" />
          </div>

          {/* Column 2: Our Services */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-white text-[16.5px] tracking-wide mb-4 flex items-center">
              Our Services
            </h3>
            <ul className="flex flex-col space-y-2 text-[13.5px]">
              {ourServices.map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="group inline-flex items-center gap-2 text-white/85 hover:text-white transition-all hover:translate-x-1 focus-visible:outline-none focus-visible:underline"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
                    <span>{service.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Divider between Col 2 & Col 3 on Desktop */}
          <div className="hidden lg:block lg:col-span-1 h-full flex justify-center py-2" aria-hidden="true">
            <div className="w-[1px] h-full min-h-[260px] bg-white/20 mx-auto" />
          </div>

          {/* Column 3: Company */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-white text-[16.5px] tracking-wide mb-4 flex items-center">
              Company
            </h3>
            <ul className="flex flex-col space-y-2 text-[13.5px]">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-2 text-white/85 hover:text-white transition-all hover:translate-x-1 focus-visible:outline-none focus-visible:underline"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Staff & Partner Portal Logins */}
        <div className="mt-10 flex flex-col lg:flex-row lg:items-center gap-4 rounded-2xl bg-white/[0.08] border border-white/15 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-white text-[15px] leading-tight">Staff &amp; Partner Login</h3>
              <p className="text-[12px] text-white/70">Portals for our doctors, hospitals, labs and team</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2.5 lg:ml-auto">
            {staffLogins.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white hover:bg-white hover:text-[#0052d4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Horizontal Divider Line */}
        <div className="w-full h-[1px] bg-white/20 my-8" />

        {/* Bottom Subfooter Section */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* Made with a steady supply line */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[13.5px] text-white/90 font-medium">
            <span>Made with a steady supply of</span>
            <span className="text-white text-base leading-none" aria-label="love">🤍</span>
            <span>together with</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-white">
              <Image
                src="/logo-icon-white.png"
                alt=""
                width={18}
                height={18}
                className="w-4 h-4 object-contain inline-block"
              />
              Consult your Doctor
            </span>
          </div>

          {/* Disclaimer text */}
          <p className="text-[11.5px] sm:text-[12px] leading-relaxed text-white/70 max-w-5xl text-center">
            Consult Your Doctor enables patients to access telehealth services and allows them to connect with licensed medical providers. Consult Your Doctor does not provide medical advice, own or operate medical practices, or supervise clinicians. Get more information about the{" "}
            <Link
              href="/terms-of-use"
              className="text-white font-semibold underline underline-offset-2 hover:text-white/90 focus-visible:outline-none"
            >
              relationship between Consult Your Doctor and the medical providers
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
