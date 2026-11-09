import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { HelpCenter } from "@/components/site/HelpCenter";
import { SitePage } from "@/components/site/ui";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Answers about bookings, payments, reports and partnering with Consult your Doctor, and where to find our offices.",
};

// The user's ContactDesk / ContactMobile designs: a blue hero, the help topics, and the two offices.
const OFFICES = [
  {
    eyebrow: "Registered office · Hyderabad, India",
    about:
      "Our registered office is in Madhapur, at the heart of Hyderabad’s technology district. It is our home in India and the base from which we work with partner hospitals, diagnostic centres and doctors to bring trusted care closer to patients.",
    address: "Plot No. 13, Survey P64/2, Software Unit Layout, Madhapur, Shaikpet, Hyderabad, Telangana 500081, India.",
    map: "https://www.google.com/maps/search/?api=1&query=Software+Unit+Layout+Madhapur+Hyderabad+500081",
  },
  {
    eyebrow: "Operational office · Frankfurt, Germany",
    about:
      "Our operational office is on Bockenheimer Landstraße in Frankfurt am Main. It looks after our international operations and company administration, and keeps our work in India connected with our team in Europe.",
    address: "Bockenheimer Landstraße 17–19, 60325 Frankfurt am Main, Germany.",
    map: "https://www.google.com/maps/search/?api=1&query=Bockenheimer+Landstra%C3%9Fe+17-19+60325+Frankfurt",
  },
];

export default function ContactPage() {
  return (
    <SitePage>
      <section className="bg-[#1D4ED8] text-white px-4 md:px-[max(24px,10%)] pt-5 pb-7 lg:pt-[34px] lg:pb-[120px]">
        <h1 className="text-[28px] lg:text-[40px] font-extrabold tracking-[-0.02em]">Help &amp; Support</h1>
        <p className="mt-1.5 lg:mt-2 text-[14.5px] lg:text-[17px] text-[#DCE7FF]">Let’s take a step ahead and help you better.</p>
      </section>

      <HelpCenter contact={{ phone: COMPANY.phone, phoneHref: COMPANY.phoneHref, email: COMPANY.email }} />

      <section className="mt-[22px] lg:mt-0 border-t border-[#EEF2F7] lg:border-t-0 px-4 md:px-[max(24px,10%)] pt-7 pb-8 lg:pt-[72px] lg:pb-[84px]">
        <h2 className="text-[23px] lg:text-[32px] font-extrabold tracking-[-0.02em] lg:leading-[1.15]">
          Our <span className="text-[#1D4ED8]">offices</span>
        </h2>
        <p className="mt-2 lg:mt-2.5 mb-4 lg:mb-7 text-[14.5px] lg:text-[16px] leading-[1.55] lg:leading-[1.6] text-[#4A5878]">We work from two offices, one in India and one in Germany.</p>
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-12 max-w-[1100px]">
          {OFFICES.map((o, i) => (
            <div key={o.eyebrow} className={i ? "pt-5 border-t border-[#E6EBF3] lg:pt-0 lg:border-t-0 lg:pl-12 lg:border-l" : ""}>
              <p className="text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8]">{o.eyebrow}</p>
              <p className="mt-2.5 text-[14.5px] lg:text-[16px] leading-[1.75] text-[#4A5878]">{o.about}</p>
              <p className="mt-3 text-[14.5px] lg:text-[16px] leading-[1.75] text-[#4A5878]">
                <strong className="font-extrabold text-[#0B1B3F]">Address:</strong> {o.address}
              </p>
              <p className="mt-3 text-[14.5px] lg:text-[16px] leading-[1.75] text-[#4A5878]">
                If you plan to visit, please let us know in advance so the right person is available to meet you.{" "}
                <a href={o.map} target="_blank" rel="noopener noreferrer" className="font-extrabold text-[#1D4ED8] whitespace-nowrap hover:underline underline-offset-4">
                  Get directions
                </a>
              </p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </SitePage>
  );
}
