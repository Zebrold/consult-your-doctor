"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, Stethoscope, Building2, TestTubeDiagonal, Info, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ClientHeader({ user }: { user: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isLinkActive = (href: string) => {
    const [path, query] = href.split('?');
    if (query) {
      const urlParams = new URLSearchParams(query);
      const type = urlParams.get('type');
      return pathname === path && searchParams.get('type') === type;
    }
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Find Doctors", href: "/search?type=doctor" },
    { name: "Hospitals", href: "/search?type=hospital" },
    { name: "Diagnostics", href: "/search?type=diagnostic" },
    { name: "About Us", href: "/about" },
  ];

  return (
    <header className="bg-surface-container-lowest/95 backdrop-blur fixed top-0 left-0 w-full z-50 transition-all border-b border-surface-variant shadow-sm">
      <div className="max-w-container-max mx-auto flex justify-between items-center px-4 md:px-margin-x-desktop h-[80px]">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Stethoscope className="text-vibrant-blue w-8 h-8" />
          <Link href="/" className="text-vibrant-blue text-[22px] font-normal tracking-tight font-sans">
            Consult your Doctor
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = isLinkActive(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`transition-colors font-semibold ${
                  isActive ? "text-vibrant-blue font-bold" : "text-slate-600 hover:text-vibrant-blue"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth / User Action */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                href={user.user_metadata?.role === "doctor" ? "/doctor/dashboard" : user.user_metadata?.role === "diagnostic_center" ? "/diagnostic/dashboard" : "/patient/dashboard"}
                className="flex items-center gap-2 text-slate-700 font-bold hover:text-vibrant-blue text-[15px] transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 text-vibrant-blue" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-surface-variant bg-surface-container-lowest text-on-surface px-5 py-2 font-bold text-[14px] hover:bg-surface-variant transition-all shadow-sm"
              >
                <LogOut className="w-4 h-4 text-outline" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-vibrant-blue text-white px-7 py-2.5 font-bold text-[15px] hover:opacity-90 transition-all shadow-sm"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-on-surface hover:text-vibrant-blue transition-colors p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[80px] left-0 w-full bg-surface-container-lowest border-b border-surface-variant shadow-lg flex flex-col py-4 px-6 gap-4 slide-down z-40">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg font-semibold ${
                    isActive ? "text-vibrant-blue font-bold" : "text-slate-600 hover:text-vibrant-blue"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="h-px w-full bg-surface-variant my-2" />

          {user ? (
            <div className="flex flex-col gap-4">
              <Link
                href={user.user_metadata?.role === "doctor" ? "/doctor/dashboard" : user.user_metadata?.role === "diagnostic_center" ? "/diagnostic/dashboard" : "/patient/dashboard"}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 text-slate-700 font-bold hover:text-vibrant-blue text-lg"
              >
                <LayoutDashboard className="w-6 h-6 text-vibrant-blue" />
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 text-slate-700 font-bold hover:text-vibrant-blue text-lg"
              >
                <LogOut className="w-6 h-6 text-outline" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-xl bg-vibrant-blue text-white px-5 py-3 font-bold text-center text-lg shadow-sm"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
