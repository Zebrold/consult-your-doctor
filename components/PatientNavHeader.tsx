"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, House, LifeBuoy, LogIn, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { initials } from "@/components/patient/format";

interface PatientNavHeaderProps {
  title: string;
  name?: string | null;
  email?: string | null;
  isSignedIn?: boolean;
  backHref?: string;
}

const links = [
  { href: "/", label: "Home", icon: House },
  { href: "/find", label: "Find a doctor", icon: Search },
  { href: "/patient/appointments", label: "My appointments", icon: CalendarDays },
  { href: "/patient/profile", label: "My profile", icon: UserRound },
];

/** Phone-sized app bar for the patient pages, with a slide-out menu. Hidden from tablet width up. */
export function PatientNavHeader({ title, name, email, isSignedIn = false, backHref }: PatientNavHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 inset-x-0 z-40 bg-surface/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="h-16 px-margin-x-mobile flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="w-11 h-11 -ml-2.5 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full transition-colors shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            {backHref && (
              <Link href={backHref} aria-label="Back" className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-full shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <span className="font-headline-lg-mobile text-title-md tracking-tight text-on-surface truncate">{title}</span>
          </div>
          <Link
            href={isSignedIn ? "/patient/profile" : "/login/patient"}
            aria-label={isSignedIn ? "My profile" : "Sign in"}
            className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 text-[11px] font-bold"
          >
            {isSignedIn && name ? initials(name) : <UserRound className="w-[18px] h-[18px]" />}
          </Link>
        </div>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-indigo-gray-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[82vw] h-full bg-surface-container-lowest shadow-2xl flex flex-col">
            <div className="p-5 flex items-center justify-between gap-3 bg-surface-container-low">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {isSignedIn && name ? initials(name) : <UserRound className="w-5 h-5" />}
                </span>
                <div className="min-w-0">
                  <p className="font-title-md text-[15px] font-bold text-on-surface truncate">{isSignedIn ? name || "Your account" : "Welcome"}</p>
                  <p className="text-xs text-on-surface-variant truncate">{isSignedIn ? email || "Patient account" : "Sign in to book and track visits"}</p>
                </div>
              </div>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-3 flex flex-col gap-1 flex-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  {label}
                </Link>
              ))}
              <div className="my-2 border-t border-surface-container" />
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
              >
                <LifeBuoy className="w-5 h-5" />
                Help &amp; contact
              </Link>
            </nav>

            <div className="p-4 border-t border-surface-container">
              {isSignedIn ? (
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full py-3 rounded-xl bg-error/10 text-error font-title-md text-sm font-bold flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </form>
              ) : (
                <Link href="/login/patient" className="w-full py-3 rounded-full bg-vibrant-blue text-on-primary font-title-md text-sm font-bold flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" /> Sign in or create account
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
