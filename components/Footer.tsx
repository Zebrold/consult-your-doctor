import Link from "next/link";
import { Info, ArrowRight, Stethoscope } from "lucide-react";

export function Footer() {
  return (
    <>
      <section className="py-20 px-margin-x-desktop bg-surface-container-low border-t border-surface-variant">
        <div className="max-w-container-max mx-auto reveal-up active">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full text-xs font-bold tracking-wider">
              <Info className="w-4 h-4" />
              ABOUT CONSULT YOUR DOCTOR
            </div>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              A Connected Healthcare Platform
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Consult Your Doctor is a pioneering health-tech ecosystem designed to bridge the gap between patients, top-tier medical specialists, renowned hospitals, and advanced diagnostic facilities. We streamline your entire medical journey through intelligent routing and frictionless scheduling.
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Built on a foundation of responsible AI and uncompromising patient-centred design, our platform ensures your health data remains secure while giving you immediate access to second opinions, emergency care coordinators, and personalized wellness plans from anywhere in the world.
            </p>
            <div className="pt-2">
              <Link href="/about" className="text-vibrant-blue font-bold text-base hover:underline flex items-center gap-1 cursor-pointer">
                Learn More About Us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-indigo-gray-900 text-white w-full py-16 px-margin-x-desktop">
        <div className="max-w-container-max mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-16">
            {/* Brand Column */}
            <div className="md:col-span-3 space-y-6">
              <div className="flex items-center gap-2">
                <Stethoscope className="text-vibrant-blue w-8 h-8" />
                <span className="font-display-lg text-xl text-white tracking-tight">
                  Consult your Doctor
                </span>
              </div>
              <p className="text-white/70 font-body-md max-w-xs">
                Your personal healthcare concierge. We connect patients with top doctors, hospitals and executives with complete support.
              </p>
            </div>
            {/* Links Columns */}
            <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              <div className="space-y-4">
                <h4 className="font-title-md text-white font-semibold text-base">Company</h4>
                <ul className="space-y-2">
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">About Us</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Careers</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Blog</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Press & Media</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-title-md text-white font-semibold text-base">For Patients</h4>
                <ul className="space-y-2">
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Find Doctors</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Find Hospitals</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Health Check Packages</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Diagnostics</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-title-md text-white font-semibold text-base">For Hospitals</h4>
                <ul className="space-y-2">
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">List Your Hospital</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Hospital Login</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Resource Center</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Partnerships</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-title-md text-white font-semibold text-base">For Doctors</h4>
                <ul className="space-y-2">
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Doctor Login</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Benefits</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Resources</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Support</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-title-md text-white font-semibold text-base">For Executives</h4>
                <ul className="space-y-2">
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Executive Login</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">How It Works</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Benefits</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Support</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-title-md text-white font-semibold text-base">Policies</h4>
                <ul className="space-y-2">
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Privacy Policy</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Terms of Use</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Refund Policy</Link></li>
                  <li><Link className="text-white/70 hover:text-white transition-colors text-sm font-body-md" href="#">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="text-white/50 text-sm font-body-md">© {new Date().getFullYear()} Consult Your Doctor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
