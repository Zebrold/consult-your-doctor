"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AppComingSoon } from "./AppComingSoon";

const navLinks = [
  { name: "How it works", href: "/how-it-works" },
  { name: "What we treat", href: "/what-we-treat" },
  { name: "Book a doctor", href: "/online-doctor" },
  { name: "Prices", href: "/prices" },
];

// Phones have no other navigation above the footer, so the menu also offers these.
const moreLinks = [
  { name: "Hospitals", href: "/hospitals" },
  { name: "Lab tests", href: "/diagnostics" },
  { name: "About us", href: "/about" },
  { name: "Contact us", href: "/contact" },
];

export function ClientHeader({ user }: { user: User | null }) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so it closes by itself on navigation (links, back, forward).
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const isMobileMenuOpen = menuPath === pathname;
  const closeMenu = () => setMenuPath(null);
  const router = useRouter();

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuPath(null);
    // Keep the page behind the menu from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Each account's own portal (staff can open the public legal pages, so the header links them back home).
  const PORTAL_HOME: Record<string, string> = {
    doctor: "/doctor/dashboard",
    hospital_admin: "/hospital/dashboard",
    diagnostic_admin: "/diagnostic-center/dashboard",
    executive: "/executive/dashboard",
    super_admin: "/admin/dashboard",
  };
  const dashboardHref = PORTAL_HOME[String(user?.user_metadata?.role ?? "")] ?? "/patient/profile";

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-[env(safe-area-inset-top)]">
        <div className="h-16 md:h-20 max-w-container-max mx-auto px-4 sm:px-margin-x-mobile lg:px-margin-x-desktop flex items-center justify-between gap-3 lg:gap-gutter">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0" aria-label="Consult your Doctor home">
            <Image
              src="/logo-icon.png"
              alt="Consult your Doctor"
              width={52}
              height={52}
              className="w-9 h-9 sm:w-11 sm:h-11 md:w-[50px] md:h-[50px] object-contain shrink-0"
              priority
            />
            <span className="font-title-md text-[17px] sm:text-xl md:text-[22px] text-on-surface font-extrabold tracking-tight leading-tight truncate">
              Consult your Doctor
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`font-body-md text-body-md transition-colors ${
                    isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop: Sign In (the dashboard once signed in) and the app download badge, nothing else */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link href={dashboardHref} className="flex items-center gap-1.5 px-2 text-on-surface font-semibold hover:text-vibrant-blue text-[14px] transition-colors">
                  <LayoutDashboard className="w-4 h-4 text-vibrant-blue" />
                  Dashboard
                </Link>
                <button onClick={handleLogout} aria-label="Log out" title="Log out" className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-6 py-2.5 rounded-full bg-vibrant-blue text-on-primary text-[15px] font-bold shadow-[0_6px_16px_rgba(15,23,42,0.11)] hover:bg-primary hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)] active:scale-[0.98] transition-all"
              >
                Sign In
              </Link>
            )}
            <AppComingSoon />
          </div>

          {/* Mobile: app badge and menu toggle. The smallest phones skip the badge so the name fits. */}
          <div className="lg:hidden flex items-center gap-1 shrink-0 -mr-1.5">
            <div className="hidden min-[360px]:block">
              <AppComingSoon compact />
            </div>
            <button
              type="button"
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:bg-surface-container-high transition-colors"
              onClick={() => (isMobileMenuOpen ? closeMenu() : setMenuPath(pathname))}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu: a sheet under the bar over the dimmed page. It sits outside the header, whose backdrop blur would
          otherwise pin it to the header's own box. */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 top-(--header-h) z-40 transition-[opacity,visibility] duration-200 ${
          isMobileMenuOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <button type="button" tabIndex={-1} aria-label="Close menu" onClick={closeMenu} className="absolute inset-0 w-full h-full bg-slate-900/30" />
        <div
          id="mobile-menu"
          className={`relative max-h-full overflow-y-auto overscroll-contain bg-surface-container-lowest rounded-b-3xl shadow-[0_24px_48px_rgba(15,23,42,0.18)] px-3 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-200 ease-out ${
            isMobileMenuOpen ? "translate-y-0" : "-translate-y-3"
          }`}
        >
          <nav aria-label="Main" className="flex flex-col">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between gap-3 min-h-[52px] px-3 rounded-2xl text-[17px] font-semibold transition-colors active:bg-surface-container ${
                    isActive ? "text-primary bg-primary-fixed/60" : "text-on-surface"
                  }`}
                >
                  {link.name}
                  <ChevronRight className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-outline-variant"}`} />
                </Link>
              );
            })}
          </nav>

          <div className="h-px mx-3 my-2 bg-surface-variant" />

          <nav aria-label="More" className="grid grid-cols-2 gap-1">
            {moreLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenu}
                aria-current={isLinkActive(link.href) ? "page" : undefined}
                className={`flex items-center min-h-[44px] px-3 rounded-xl text-[15px] font-medium transition-colors active:bg-surface-container ${
                  isLinkActive(link.href) ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="mt-3 px-1 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 h-12 rounded-full bg-vibrant-blue text-on-primary font-bold text-base shadow-[0_6px_16px_rgba(15,23,42,0.11)] active:scale-[0.99] transition-transform"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 h-12 rounded-full border border-outline-variant text-on-surface font-semibold text-base active:bg-surface-container transition-colors"
                >
                  <LogOut className="w-5 h-5 text-outline" />
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center justify-center h-12 rounded-full bg-vibrant-blue text-on-primary font-bold text-base shadow-[0_6px_16px_rgba(15,23,42,0.11)] active:scale-[0.99] transition-transform"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
