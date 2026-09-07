import Link from "next/link";
import { Stethoscope } from "lucide-react";

const footerSections = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/about" },
      { label: "Blog", href: "/about" },
      { label: "Press & Media", href: "/about" },
    ],
  },
  {
    title: "For Patients",
    links: [
      { label: "Find Doctors", href: "/search?type=doctor" },
      { label: "Find Hospitals", href: "/search?type=hospital" },
      {
        label: "Health Check Packages",
        href: "/search?type=diagnostic",
      },
      { label: "Diagnostics", href: "/search?type=diagnostic" },
    ],
  },
  {
    title: "For Hospitals",
    links: [
      { label: "Hospital Login", href: "/login/hospital" },
      { label: "List Your Hospital", href: "/signup" },
      { label: "Resource Center", href: "/about" },
      { label: "Partnerships", href: "/about" },
    ],
  },
  {
    title: "For Doctors",
    links: [
      { label: "Doctor Login", href: "/login/doctor" },
      { label: "Benefits", href: "/about" },
      { label: "Resources", href: "/about" },
      { label: "Support", href: "/about" },
    ],
  },
  {
    title: "For Executives",
    links: [
      { label: "Executive Login", href: "/login/corporate" },
      { label: "How It Works", href: "/about" },
      { label: "Benefits", href: "/about" },
      { label: "Support", href: "/about" },
    ],
  },
  {
    title: "For Diagnostics Centres",
    links: [
      {
        label: "Diagnostics Centres Login",
        href: "/login/diagnostic",
      },
      { label: "How It Works", href: "/about" },
      { label: "Benefits", href: "/about" },
      { label: "Support", href: "/about" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Use", href: "/terms-of-use" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Cookie Policy", href: "/cookie-policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full bg-indigo-gray-900 text-white">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-14 sm:px-8 md:px-10 lg:px-12 xl:px-16 lg:py-16">
        {/* Main Footer */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_1fr] xl:gap-16">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="inline-flex items-start gap-3"
              aria-label="Consult Your Doctor home"
            >
              <Stethoscope
                className="mt-1 h-8 w-8 shrink-0 text-vibrant-blue"
                strokeWidth={2}
              />

              <span className="max-w-[180px] text-[22px] font-medium leading-[1.4] tracking-tight text-white">
                Consult Your Doctor
              </span>
            </Link>

            <p className="mt-7 max-w-[250px] text-base leading-7 text-white/70">
              Your personal healthcare concierge. We connect patients with top
              doctors, hospitals and executives with complete support.
            </p>
          </div>

          {/* Footer Links */}
          <div
            className="
              grid
              grid-cols-2
              gap-x-8
              gap-y-10
              sm:grid-cols-3
              md:gap-x-10
              xl:grid-cols-4
              2xl:grid-cols-7
              2xl:gap-x-7
            "
          >
            {footerSections.map((section) => (
              <div key={section.title} className="min-w-0">
                <h4 className="mb-5 text-sm font-semibold leading-5 tracking-tight text-white">
                  {section.title}
                </h4>

                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="
                          block
                          text-sm
                          leading-6
                          text-white/70
                          transition-colors
                          duration-200
                          hover:text-white
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-vibrant-blue
                          focus-visible:ring-offset-2
                          focus-visible:ring-offset-indigo-gray-900
                        "
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
        <div className="mt-14 border-t border-white/10 pt-7 lg:mt-16">
          <p className="text-sm leading-6 text-white/50">
            © {new Date().getFullYear()} Consult Your Doctor. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}