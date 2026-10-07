"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Menu, X, LogOut, LayoutDashboard, Stethoscope } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppComingSoon } from "./AppComingSoon";

const navLinks = [
  { name: "How it works", href: "/how-it-works" },
  { name: "What we treat", href: "/what-we-treat" },
  { name: "Online doctor", href: "/online-doctor" },
  { name: "Prices", href: "/prices" },
];

export function ClientHeader({ user }: { user: any }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const dashboardHref =
    user?.user_metadata?.role === "doctor"
      ? "/doctor/dashboard"
      : user?.user_metadata?.role === "diagnostic_center"
        ? "/diagnostic/dashboard"
        : "/patient/profile";

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop flex items-center justify-between gap-gutter">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Consult your Doctor home">
          <Image
            src="/logo-icon.png"
            alt="Consult your Doctor"
            width={40}
            height={40}
            className="w-10 h-10 object-contain shrink-0 transition-transform group-hover:scale-105"
            priority
          />
          <span className="font-title-md text-lg md:text-title-md text-on-surface font-bold tracking-tight leading-tight">
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

        {/* Desktop Auth / User Action */}
        <div className="hidden lg:flex items-center gap-4">
          <AppComingSoon />
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 text-on-surface font-bold hover:text-vibrant-blue text-[15px] transition-colors"
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
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-vibrant-blue text-on-primary font-label-sm text-label-sm shadow-[0_4px_12px_rgba(0,102,255,0.2)] hover:bg-primary transition-all"
            >
              Login / Register <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Mobile: app badge and menu toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <AppComingSoon compact />
          <button
            className="text-on-surface hover:text-vibrant-blue transition-colors p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full bg-surface-container-lowest border-b border-surface-variant shadow-lg flex flex-col py-4 px-6 gap-4 z-40">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-lg font-semibold ${
                    isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
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
                href={dashboardHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 text-on-surface font-bold hover:text-vibrant-blue text-lg"
              >
                <LayoutDashboard className="w-6 h-6 text-vibrant-blue" />
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 text-on-surface font-bold hover:text-vibrant-blue text-lg"
              >
                <LogOut className="w-6 h-6 text-outline" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-vibrant-blue text-white px-5 py-3 font-bold text-lg shadow-sm"
            >
              Login / Register <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
