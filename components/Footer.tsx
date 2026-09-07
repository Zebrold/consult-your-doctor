import Link from "next/link";
import { Info, ArrowRight, Stethoscope } from "lucide-react";

export function Footer() {
  return (
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
  );
}
