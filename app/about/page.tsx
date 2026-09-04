import { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'About Us | Consult Your Doctor',
  description: 'Learn about our mission to redefine global healthcare.',
}

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col font-sans">
      <Header />

      <main className="w-full flex-grow">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-[120px] px-4 md:px-12 max-w-[1280px] mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <span className="inline-block px-3 py-1 bg-[var(--color-surface-container-high)] text-[var(--color-primary)] rounded-full text-xs font-bold w-max self-start tracking-wider uppercase">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[var(--color-primary)] leading-tight tracking-tight">
              Redefining Global <br />
              <span className="text-[var(--color-secondary)]">Healthcare.</span>
            </h1>
            <p className="text-lg text-[var(--color-on-surface-variant)] max-w-lg leading-relaxed">
              We believe accessing world-class medical expertise shouldn't be constrained by borders. Consult Your Doctor connects patients with premier specialists and hospitals globally, ensuring transparent, empathetic, and premium care.
            </p>
            <div className="pt-4">
              <button className="bg-[var(--color-secondary)] text-[var(--color-on-secondary)] font-bold text-sm px-8 py-3 rounded-full hover:opacity-90 hover:scale-[1.02] transition-all shadow-[var(--shadow-ambient)]">
                Our Mission
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative shadow-[var(--shadow-ambient)]">
              <Image
                className="object-cover"
                fill
                alt="Doctors discussing chart"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6XNvWO5ViBJoyKIUIwDU-ds0dY_vuip9s2XoXGm5K38Dh-9qI-4ybchp4wMQIKiITQ9TZ9Flu_lBtjv79YPe5VXXn4yFGIcJxMZQbgL_2Yv9DFHyKI9bFG2dIbdsLQRpob8S3sBAWdn5gRpX6hYMBzMpRAhd0xPoBhfd-6vdMPa_lu_xQTcAQbBvOsnECq_k32ilUeqSCBKc5bBINDYFgDLDr8G_V2Y0ls4O0bvLk4FUQTESm6s0Wrg"
              />
            </div>
          </div>
        </section>

        {/* Mission & Values Bento Grid */}
        <section className="w-full py-16 px-4 md:px-12 bg-[var(--color-surface-container-low)] mt-12 border-y border-[var(--color-surface-variant)]">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-primary)] mb-3 tracking-tight">The Pillars of Our Care</h2>
              <p className="text-lg text-[var(--color-on-surface-variant)] max-w-2xl mx-auto">Built on transparency, driven by expertise, and focused on your well-being.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bento Card 1 */}
              <div className="bg-[var(--color-surface-container-lowest)] p-8 rounded-2xl shadow-[var(--shadow-ambient)] border border-[var(--color-surface-variant)] hover:border-[var(--color-secondary)] transition-colors group">
                <div className="w-12 h-12 bg-[var(--color-surface-container-high)] rounded-full flex items-center justify-center text-[var(--color-secondary)] mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                </div>
                <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">Global Access</h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">Bridging the gap between patients and top-tier international healthcare facilities seamlessly.</p>
              </div>

              {/* Bento Card 2 */}
              <div className="bg-[var(--color-surface-container-lowest)] p-8 rounded-2xl shadow-[var(--shadow-ambient)] border border-[var(--color-surface-variant)] hover:border-[var(--color-secondary)] transition-colors group md:col-span-2 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute right-0 top-0 w-64 h-64 bg-[var(--color-secondary)]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 w-full md:w-2/3">
                  <div className="w-12 h-12 bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-primary)] mb-2">Uncompromising Quality</h3>
                  <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">Every specialist and hospital in our network undergoes rigorous vetting to ensure they meet international standards of medical excellence.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Leadership */}
        <section className="w-full py-16 md:py-[100px] px-4 md:px-12 max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-primary)] tracking-tight">Leadership Team</h2>
              <p className="text-lg text-[var(--color-on-surface-variant)] mt-2">The visionaries powering our global network.</p>
            </div>
            <button className="text-sm font-bold text-[var(--color-primary)] border-2 border-[var(--color-outline-variant)] px-6 py-2 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors">
              Join Our Team
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Member 1 */}
            <div className="flex flex-col gap-3 group">
              <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[var(--color-surface-container-high)] relative">
                <Image className="object-cover transition-transform duration-500 group-hover:scale-105" fill alt="Dr. Sarah Jenkins" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSFz3BKTSEF-khTsGR6cbobXXhbg0YcbbCiWfIcs9LPPO4SidReW8VN_a0Hz7TQWHO3chtkwgZGeF68TPg7NvzGU6PnIxpPuOlSGn0rF030Iqm7nbDm19W3Q3bJwyNsKcPxboA7K8h3Iei5ROnsjBOLrfmmD4BEhWYqw3OWF9g9W2LkHyw2MBhh6Ax_q7xj-Isp6gwT6g1Icb3k2pmvBZXiq-zxSnkdWAG-N132P4Sg6q5ZRlPdVfzxQ" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--color-primary)]">Dr. Sarah Jenkins</h4>
                <p className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider mt-1">Chief Medical Officer</p>
              </div>
            </div>
            {/* Member 2 */}
            <div className="flex flex-col gap-3 group">
              <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[var(--color-surface-container-high)] relative">
                <Image className="object-cover transition-transform duration-500 group-hover:scale-105" fill alt="Marcus Thorne" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdYaNNxQiN6VC1Hycr7Q51xphEQCgYfFUtsdZf_3Oxiv5THlO6y6Gj2_whoVo4BXiPWsAM7lmDhhvbwH6kdyWIXkJtf47sl7uakXDD9jxzN4do3yDDmB-W8gXWV5vJPfKCQIPjXKnzf_J2WZn8hgCgEMzDmkuFAkow6TaxiB-8RrjeWUK2G4D4n70jtsMJUWO5lr5CxjJzx5VVIkfIKPZCXUOW66u-geo-OtcBPwTzEMeP9aJh2Etafg" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--color-primary)]">Marcus Thorne</h4>
                <p className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider mt-1">CEO & Founder</p>
              </div>
            </div>
            {/* Member 3 */}
            <div className="flex flex-col gap-3 group">
              <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[var(--color-surface-container-high)] relative">
                <Image className="object-cover transition-transform duration-500 group-hover:scale-105" fill alt="Elena Rostova" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_n6HEwALN7cnheXpcMvE60OBgtl4lCM7-VVCQ1lu5p7APcMcKILDJMW9pBQbNhSXVZylXW_c1COsDf72Eo5Wz2hG2KgsPzaXri_rkbk8wJrijngLZXdUM8eji8BKN1q7jtuBo_yqrrDclS5CjtaJ4COwTN_hcbNMPQ3cltJkPS-7_uzsPHqNqVuU_gLFyeunoq8atN9rpi_XDQkYmZwMjDW7GfX7ukzFZyOFxVnMxe-J72tH9OCG0tQ" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--color-primary)]">Elena Rostova</h4>
                <p className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider mt-1">Head of Global Partnerships</p>
              </div>
            </div>
            {/* Member 4 */}
            <div className="flex flex-col gap-3 group">
              <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[var(--color-surface-container-high)] relative">
                <Image className="object-cover transition-transform duration-500 group-hover:scale-105" fill alt="David Chen" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoecGfDNwgpoF2kDSIl7-4LzZueodlkN0fC-CMQHX6u3N_8OQMJ8hpPIjF3rKlIpqthOCKfPBCqEhNaSJV7ByJwspUGx1D6FmdEdzvbtXOym5IThDTU2ceZMLoTxMcAFgy-BBfkputVXc8q8c-ogKTkE4wGCiGxEgNPVg_S8m9kuxTtLH-zDdr-BK6fGerGvK52NllX5QuOBCTyNa0wJu3BZLhAbuhthLZcCZhWsZ5Ce3hvHWJ96k4qw" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[var(--color-primary)]">David Chen</h4>
                <p className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider mt-1">Chief Technology Officer</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact & Location Map */}
        <section className="w-full py-16 border-t border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-12 flex flex-col md:flex-row gap-12">
            <div className="w-full md:w-1/3 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-[var(--color-primary)] mb-3 tracking-tight">Our Headquarters</h2>
              <p className="text-base text-[var(--color-on-surface-variant)] mb-6">Located in the heart of medical innovation, our global headquarters orchestrates care across 40+ countries.</p>
              <div className="flex flex-col gap-3 font-medium text-sm text-[var(--color-primary)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-secondary)]">location_on</span>
                  <span>100 Innovation Drive, London, UK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-secondary)]">mail</span>
                  <span>contact@consultourdoctor.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-secondary)]">call</span>
                  <span>+44 20 7946 0958</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3 h-[400px] rounded-2xl overflow-hidden shadow-[var(--shadow-ambient)] border border-[var(--color-surface-variant)] relative">
              <Image
                className="object-cover"
                fill
                alt="Map showing London, UK"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbc5EBdO03Y1lQX7SZykP0ZReUnJZpLKc2JnY8YVkeocf5k6bRf77EF_8jBQxuo2iQ012ZtZxnt5efr5xYtieRr6JhEaAOyYXgQF2T2a42kYVjx8z0SeDswxAfDo73lWvTEaSsHJJ6qBxVQEqRD5XRYyUK_g7fU0WAraXe3R-yY0Xv42ZAMc_SRpUDXJJ__JH_LtkWDwxO9-qqKdNCntRhzECYKsuBCwL00o0zWjG5XLdTgYJ7zbBLZg"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
