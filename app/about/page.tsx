import { Globe, ShieldCheck, MapPin, Mail, Phone } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full pt-stack-lg pb-stack-lg md:pt-[120px] md:pb-[80px] px-margin-x-mobile md:px-margin-x-desktop max-w-container-max mx-auto flex flex-col md:flex-row items-center gap-stack-lg">
        <div className="w-full md:w-1/2 flex flex-col gap-stack-md">
          <span className="inline-block px-3 py-1 bg-surface-container-high text-primary rounded-full font-label-sm text-label-sm w-max self-start tracking-wider uppercase">
            Our Story
          </span>
          <h1 className="font-display-lg text-display-lg text-indigo-gray-900 leading-tight">
            Redefining Global <br />
            <span className="text-vibrant-blue">Healthcare.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-indigo-gray-600 max-w-lg">
            We believe accessing world-class medical expertise shouldn't be constrained by borders. Consult Your Doctor connects patients with premier specialists and hospitals globally, ensuring transparent, empathetic, and premium care.
          </p>
          <div className="pt-stack-sm">
            <button className="font-label-sm text-label-sm bg-vibrant-blue text-white px-8 py-3 rounded-full hover:scale-[1.02] hover:bg-primary transition-all shadow-[0_4px_14px_0_rgba(0,102,255,0.39)]">
              Our Mission
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative shadow-[0px_20px_40px_-10px_rgba(0,102,255,0.1)]">
            <img
              className="w-full h-full object-cover"
              alt="Professional medical environment"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6XNvWO5ViBJoyKIUIwDU-ds0dY_vuip9s2XoXGm5K38Dh-9qI-4ybchp4wMQIKiITQ9TZ9Flu_lBtjv79YPe5VXXn4yFGIcJxMZQbgL_2Yv9DFHyKI9bFG2dIbdsLQRpob8S3sBAWdn5gRpX6hYMBzMpRAhd0xPoBhfd-6vdMPa_lu_xQTcAQbBvOsnECq_k32ilUeqSCBKc5bBINDYFgDLDr8G_V2Y0ls4O0bvLk4FUQTESm6s0Wrg"
            />
          </div>
        </div>
      </section>

      {/* Mission & Values Bento Grid */}
      <section className="w-full py-stack-lg px-margin-x-mobile md:px-margin-x-desktop bg-surface-container-low mt-stack-lg">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-indigo-gray-900 mb-stack-sm">The Pillars of Our Care</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600 max-w-2xl mx-auto">
              Built on transparency, driven by expertise, and focused on your well-being.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Bento Card 1 */}
            <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0px_4px_20px_rgba(0,102,255,0.05)] border border-indigo-gray-200/50 hover:border-vibrant-blue transition-colors group">
              <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-vibrant-blue mb-stack-sm group-hover:scale-110 transition-transform">
                <Globe className="w-6 h-6 fill-current" />
              </div>
              <h3 className="font-title-md text-title-md text-indigo-gray-900 mb-base">Global Access</h3>
              <p className="font-body-md text-body-md text-indigo-gray-600">
                Bridging the gap between patients and top-tier international healthcare facilities seamlessly.
              </p>
            </div>
            {/* Bento Card 2 */}
            <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0px_4px_20px_rgba(0,102,255,0.05)] border border-indigo-gray-200/50 hover:border-vibrant-blue transition-colors group md:col-span-2 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute right-0 top-0 w-64 h-64 bg-vibrant-blue/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <div className="relative z-10 w-full md:w-2/3">
                <div className="w-12 h-12 bg-secondary-container text-secondary rounded-full flex items-center justify-center mb-stack-sm group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6 fill-current" />
                </div>
                <h3 className="font-title-md text-title-md text-indigo-gray-900 mb-base">Uncompromising Quality</h3>
                <p className="font-body-md text-body-md text-indigo-gray-600">
                  Every specialist and hospital in our network undergoes rigorous vetting to ensure they meet international standards of medical excellence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Leadership */}
      <section className="w-full py-stack-lg md:py-[100px] px-margin-x-mobile md:px-margin-x-desktop max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-stack-lg gap-stack-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-indigo-gray-900">Leadership Team</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600 mt-base">The visionaries powering our global network.</p>
          </div>
          <button className="font-label-sm text-label-sm text-indigo-gray-900 border-[1.5px] border-indigo-gray-200 px-6 py-2 rounded-full hover:bg-indigo-gray-50 transition-colors">
            Join Our Team
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter">
          {/* Member 1 */}
          <div className="flex flex-col gap-stack-sm">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-surface-container-high relative">
              <img
                className="w-full h-full object-cover"
                alt="Chief Medical Officer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSFz3BKTSEF-khTsGR6cbobXXhbg0YcbbCiWfIcs9LPPO4SidReW8VN_a0Hz7TQWHO3chtkwgZGeF68TPg7NvzGU6PnIxpPuOlSGn0rF030Iqm7nbDm19W3Q3bJwyNsKcPxboA7K8h3Iei5ROnsjBOLrfmmD4BEhWYqw3OWF9g9W2LkHyw2MBhh6Ax_q7xj-Isp6gwT6g1Icb3k2pmvBZXiq-zxSnkdWAG-N132P4Sg6q5ZRlPdVfzxQ"
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md text-indigo-gray-900">Dr. Sarah Jenkins</h4>
              <p className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-wider mt-1">Chief Medical Officer</p>
            </div>
          </div>
          {/* Member 2 */}
          <div className="flex flex-col gap-stack-sm">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-surface-container-high relative">
              <img
                className="w-full h-full object-cover"
                alt="CEO & Founder"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdYaNNxQiN6VC1Hycr7Q51xphEQCgYfFUtsdZf_3Oxiv5THlO6y6Gj2_whoVo4BXiPWsAM7lmDhhvbwH6kdyWIXkJtf47sl7uakXDD9jxzN4do3yDDmB-W8gXWV5vJPfKCQIPjXKnzf_J2WZn8hgCgEMzDmkuFAkow6TaxiB-8RrjeWUK2G4D4n70jtsMJUWO5lr5CxjJzx5VVIkfIKPZCXUOW66u-geo-OtcBPwTzEMeP9aJh2Etafg"
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md text-indigo-gray-900">Marcus Thorne</h4>
              <p className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-wider mt-1">CEO & Founder</p>
            </div>
          </div>
          {/* Member 3 */}
          <div className="flex flex-col gap-stack-sm">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-surface-container-high relative">
              <img
                className="w-full h-full object-cover"
                alt="Head of Global Partnerships"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_n6HEwALN7cnheXpcMvE60OBgtl4lCM7-VVCQ1lu5p7APcMcKILDJMW9pBQbNhSXVZylXW_c1COsDf72Eo5Wz2hG2KgsPzaXri_rkbk8wJrijngLZXdUM8eji8BKN1q7jtuBo_yqrrDclS5CjtaJ4COwTN_hcbNMPQ3cltJkPS-7_uzsPHqNqVuU_gLFyeunoq8atN9rpi_XDQkYmZwMjDW7GfX7ukzFZyOFxVnMxe-J72tH9OCG0tQ"
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md text-indigo-gray-900">Elena Rostova</h4>
              <p className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-wider mt-1">Head of Global Partnerships</p>
            </div>
          </div>
          {/* Member 4 */}
          <div className="flex flex-col gap-stack-sm">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-surface-container-high relative">
              <img
                className="w-full h-full object-cover"
                alt="Chief Technology Officer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoecGfDNwgpoF2kDSIl7-4LzZueodlkN0fC-CMQHX6u3N_8OQMJ8hpPIjF3rKlIpqthOCKfPBCqEhNaSJV7ByJwspUGx1D6FmdEdzvbtXOym5IThDTU2ceZMLoTxMcAFgy-BBfkputVXc8q8c-ogKTkE4wGCiGxEgNPVg_S8m9kuxTtLH-zDdr-BK6fGerGvK52NllX5QuOBCTyNa0wJu3BZLhAbuhthLZcCZhWsZ5Ce3hvHWJ96k4qw"
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md text-indigo-gray-900">David Chen</h4>
              <p className="font-label-sm text-label-sm text-vibrant-blue uppercase tracking-wider mt-1">Chief Technology Officer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location Map */}
      <section className="w-full py-stack-lg border-t border-outline-variant/30 bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop flex flex-col md:flex-row gap-stack-lg">
          <div className="w-full md:w-1/3 flex flex-col justify-center">
            <h2 className="font-headline-lg text-headline-lg text-indigo-gray-900 mb-stack-sm">Our Headquarters</h2>
            <p className="font-body-md text-body-md text-indigo-gray-600 mb-stack-md">
              Located in the heart of medical innovation, our global headquarters orchestrates care across 40+ countries.
            </p>
            <div className="flex flex-col gap-stack-sm font-body-md text-body-md text-indigo-gray-900">
              <div className="flex items-center gap-base">
                <MapPin className="w-5 h-5 text-vibrant-blue" />
                <span className="">100 Innovation Drive, London, UK</span>
              </div>
              <div className="flex items-center gap-base">
                <Mail className="w-5 h-5 text-vibrant-blue" />
                <span className="">contact@consultourdoctor.com</span>
              </div>
              <div className="flex items-center gap-base">
                <Phone className="w-5 h-5 text-vibrant-blue" />
                <span className="">+44 20 7946 0958</span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-2/3 h-[400px] rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,102,255,0.05)] border border-indigo-gray-200/50">
            <img
              className="w-full h-full object-cover"
              alt="London HQ Map"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbc5EBdO03Y1lQX7SZykP0ZReUnJZpLKc2JnY8YVkeocf5k6bRf77EF_8jBQxuo2iQ012ZtZxnt5efr5xYtieRr6JhEaAOyYXgQF2T2a42kYVjx8z0SeDswxAfDo73lWvTEaSsHJJ6qBxVQEqRD5XRYyUK_g7fU0WAraXe3R-yY0Xv42ZAMc_SRpUDXJJ__JH_LtkWDwxO9-qqKdNCntRhzECYKsuBCwL00o0zWjG5XLdTgYJ7zbBLZg"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
