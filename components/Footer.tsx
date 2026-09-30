import Link from "next/link";
import { ShieldCheck, Star, Stethoscope } from "lucide-react";

const footerSections = [
  {
    title: "Our Services",
    links: [
      { label: "Find a Doctor Near Me", href: "/search?type=doctor" },
      { label: "Urgent Care Near Me", href: "/search?type=hospital" },
      { label: "Online Doctor Consultation", href: "/online-doctor" },
      { label: "Lab Tests & Diagnostics", href: "/search?type=diagnostic" },
      { label: "What We Treat", href: "/what-we-treat" },
      { label: "Prices", href: "/prices" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Help | FAQ", href: "/how-it-works#faq" },
      { label: "Security & Privacy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-of-use" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "For Partners",
    links: [
      { label: "Doctor Login", href: "/login/doctor" },
      { label: "Hospital Login", href: "/login/hospital" },
      { label: "Diagnostic Centre Login", href: "/login/diagnostic" },
      { label: "Executive Login", href: "/login/executive" },
      { label: "Work With Us", href: "/signup/doctor" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full bg-primary text-on-primary pt-16 pb-8">
      <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-gutter mb-12">
          {/* Brand */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-stack-sm" aria-label="Consult your Doctor home">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-on-primary/10">
                <Stethoscope className="w-5 h-5" />
              </span>
              <span className="font-title-md text-title-md font-bold">Consult your Doctor</span>
            </Link>
            <p className="font-body-md text-body-md text-on-primary/80 max-w-md">
              Consult Your Doctor connects you with verified and licensed doctors online, anytime, anywhere, so you can
              quickly get trusted medical guidance and take care of your health with confidence.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00b67a] text-white text-xs font-semibold">
                <Star className="w-4 h-4 fill-current" />
                People love us on Trustpilot
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-gray-900 text-white text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                LegitScript Certified
              </span>
            </div>
          </div>

          {/* Footer Links */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {footerSections.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <h3 className="font-title-md text-title-md font-bold mb-1">{section.title}</h3>
                <ul className="flex flex-col gap-2 font-body-md text-[15px] text-on-primary/80">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="hover:text-on-primary transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-on-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body-md text-body-md text-on-primary/80 text-center md:text-left">
            Made with a steady supply of <span aria-label="love">❤️</span> together with Consult your Doctor
          </p>
          <p className="font-label-sm text-label-sm text-on-primary/60 text-center md:text-right max-w-xl">
            © {new Date().getFullYear()} Consult Your Doctor. Telehealth services are provided by independent licensed
            clinicians. In a life-threatening emergency, call your local emergency number (112) immediately.
          </p>
        </div>
      </div>
    </footer>
  );
}
