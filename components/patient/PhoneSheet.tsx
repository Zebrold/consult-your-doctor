"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Building2, CalendarDays, ChevronDown, ChevronRight, FlaskConical, Handshake, LifeBuoy, LogIn, LogOut, Stethoscope, UserRound, X, type LucideIcon } from "lucide-react";
import { JOIN_LINKS } from "@/components/site/CorporateMenu";

/** A panel that slides up from the bottom over a dimmed page (a centred dialog on wider screens). */
export function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center md:justify-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 w-full h-full bg-slate-900/40" />
      <div className="relative w-full max-h-[85dvh] overflow-y-auto overscroll-contain bg-white rounded-t-[28px] md:max-w-lg md:rounded-[28px] shadow-[0_-12px_40px_rgba(15,23,42,0.2)] px-4 md:px-6 pt-2 md:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-6">
        <span aria-hidden className="block md:hidden w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-3" />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-title-md text-[19px] font-extrabold text-indigo-gray-900">{title}</p>
            {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 -mr-1 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The account and site menu behind the ☰ button in the phone headers. */
export function MenuSheet({ name, email, isSignedIn, onClose }: { name: string | null; email: string | null; isSignedIn: boolean; onClose: () => void }) {
  const links: { href: string; label: string; icon: LucideIcon }[] = [
    ...(isSignedIn
      ? [
          { href: "/patient/appointments", label: "My appointments", icon: CalendarDays },
          { href: "/patient/profile", label: "My profile & records", icon: UserRound },
        ]
      : []),
    { href: "/find", label: "Find a doctor", icon: Stethoscope },
    { href: "/hospitals", label: "Hospitals", icon: Building2 },
    { href: "/diagnostics", label: "Lab tests", icon: FlaskConical },
    { href: isSignedIn ? "/patient/support" : "/contact", label: "Help & support", icon: LifeBuoy },
  ];
  return (
    <Sheet title={isSignedIn ? name || "My account" : "Menu"} subtitle={isSignedIn ? email ?? undefined : undefined} onClose={onClose}>
      <nav aria-label="Account and site" className="flex flex-col">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={onClose} className="flex items-center gap-3 min-h-[52px] px-2 rounded-2xl text-[16px] font-semibold text-indigo-gray-900 active:bg-slate-100">
            <Icon className="w-5 h-5 text-vibrant-blue shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </Link>
        ))}
        {/* Corporate opens in place, like the headers' menu: the three ways to join. */}
        <details className="group">
          <summary className="flex items-center gap-3 min-h-[52px] px-2 rounded-2xl text-[16px] font-semibold text-indigo-gray-900 cursor-pointer list-none [&::-webkit-details-marker]:hidden active:bg-slate-100">
            <Handshake className="w-5 h-5 text-vibrant-blue shrink-0" />
            <span className="flex-1">Corporate</span>
            <ChevronDown className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-1 mb-2 p-1.5 rounded-[20px] bg-[#F3F6FD]">
            {JOIN_LINKS.map(({ href, title, text, icon: Icon }) => (
              <Link key={href} href={href} onClick={onClose} className="flex items-center gap-3 p-2.5 rounded-2xl active:bg-white">
                <span className="w-10 h-10 rounded-[12px] bg-white text-[#2A4DD0] flex items-center justify-center shrink-0 shadow-[0_0_0_1px_#E6EBF3]">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-bold text-indigo-gray-900">{title}</span>
                  <span className="block text-[12.5px] leading-snug text-slate-500">{text}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </Link>
            ))}
            <div className="flex items-center justify-between gap-3 px-2.5 pt-2.5 pb-2 mt-1 border-t border-[#E2E8F3] text-[13.5px] font-extrabold">
              <Link href="/corporate" onClick={onClose} className="py-1 text-[#2A4DD0]">
                How partnering works
              </Link>
              <Link href="/corporate#login" onClick={onClose} className="py-1 text-indigo-gray-900">
                Partner login
              </Link>
            </div>
          </div>
        </details>
      </nav>
      <div className="mt-3">
        {isSignedIn ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full h-12 rounded-full border border-slate-200 text-indigo-gray-900 font-semibold flex items-center justify-center gap-2 active:bg-slate-50">
              <LogOut className="w-5 h-5 text-red-600" /> Logout
            </button>
          </form>
        ) : (
          <Link href="/login/patient" onClick={onClose} className="w-full h-12 rounded-full bg-vibrant-blue text-white font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(0,102,255,0.25)]">
            <LogIn className="w-5 h-5" /> Log in or create an account
          </Link>
        )}
      </div>
      <p className="mt-4 px-2 flex gap-4 text-[13px] text-slate-500">
        <Link href="/terms-of-use" onClick={onClose} className="py-1.5">Terms &amp; Conditions</Link>
        <Link href="/privacy-policy" onClick={onClose} className="py-1.5">Privacy Policy</Link>
        <Link href="/legal" onClick={onClose} className="py-1.5">Legal</Link>
      </p>
    </Sheet>
  );
}
