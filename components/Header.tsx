import Link from "next/link";
import { Home, Stethoscope, Building2, TestTubeDiagonal, Info } from "lucide-react";

export function Header() {
  return (
    <header className="bg-surface-container-lowest/95 backdrop-blur fixed top-0 left-0 w-full z-50 px-margin-x-desktop py-4 transition-all">
      <div className="max-w-container-max mx-auto flex justify-between items-center px-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="text-vibrant-blue w-8 h-8" />
          <Link href="/" className="text-vibrant-blue text-[22px] font-normal tracking-tight font-sans">
            Consult your Doctor
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link className="text-vibrant-blue font-bold transition-colors" href="/">
            Home
          </Link>
          <Link className="text-slate-600 hover:text-vibrant-blue transition-colors font-semibold" href="/search">
            Find Doctors
          </Link>
          <Link className="text-slate-600 hover:text-vibrant-blue transition-colors font-semibold" href="/hospitals">
            Hospitals
          </Link>
          <Link className="text-slate-600 hover:text-vibrant-blue transition-colors font-semibold" href="/diagnostics">
            Diagnostics
          </Link>
          <Link className="text-slate-600 hover:text-vibrant-blue transition-colors font-semibold" href="/about">
            About Us
          </Link>
        </nav>
        <div className="flex items-center gap-8">
          <Link href="/login" className="text-slate-700 font-bold hover:text-vibrant-blue text-[15px] transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-vibrant-blue text-white px-7 py-2.5 font-bold text-[15px] hover:opacity-90 transition-all shadow-sm"
          >
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}
