"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Building2, CalendarDays, ChevronRight, FileText, FlaskConical, Handshake, LifeBuoy, LogIn, LogOut, Phone, Stethoscope, UserRound, X, type LucideIcon } from "lucide-react";
import { MY_HEALTH } from "@/components/patient/my-health";

/** A panel that slides up from the bottom over a dimmed page (a centred dialog on wider screens). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
      <div className="relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain bg-[#F5F7FB] text-[#0B1B3F] font-(family-name:--font-manrope) rounded-t-[28px] md:max-w-lg md:rounded-[28px] shadow-[0_-12px_40px_rgba(15,23,42,0.2)] px-4 md:px-6 pt-2.5 md:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-6">
        <span aria-hidden className="block md:hidden w-10 h-1.5 rounded-full bg-[#D5DBE5] mx-auto mb-3" />
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[24px] font-extrabold tracking-[-0.02em]">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-full bg-white shadow-[0_0_0_1px_#E3E8F0] flex items-center justify-center shrink-0 active:bg-slate-100">
            <X className="w-5 h-5" strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type MenuInfo = { uhid: string; upcoming: number };

/** The last answer, so reopening the menu shows the UHID at once (refreshed in the background). */
let lastInfo: MenuInfo | null = null;

/** The signed-in patient's UHID and upcoming bookings count, for the account card and the My appointments badge. */
function useMenuInfo(enabled: boolean): MenuInfo | null | "loading" {
  const [info, setInfo] = useState<MenuInfo | null | "loading">(() => (enabled ? (lastInfo ?? "loading") : null));
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetch("/api/patient/menu", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MenuInfo | null) => {
        if (!live) return;
        if (d && typeof d.uhid === "string") lastInfo = { uhid: d.uhid, upcoming: Number(d.upcoming) || 0 };
        setInfo(lastInfo);
      })
      .catch(() => live && setInfo(lastInfo));
    return () => {
      live = false;
    };
  }, [enabled]);
  return info;
}

const initialsOf = (name: string | null) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The menu's sub-lines under each My health page (Emergency has its own card). */
const HEALTH_SUB: Record<string, string> = {
  insurance: "Policy, cashless hospitals and claims",
  records: "Prescriptions, reports and scans",
  family: "Book and keep records for family",
  reminders: "From your doctor’s prescriptions",
  checkups: "Packages from partner labs",
  reviews: "Rate your recent visits",
};

/** A small uppercase heading and a white card of rows. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <p className="px-1 mb-2 text-[12.5px] font-extrabold uppercase tracking-[0.09em] text-[#5B667A]">{label}</p>
      <div className="rounded-[20px] bg-white shadow-[0_0_0_1px_#E3E8F0] overflow-hidden divide-y divide-[#EEF2F7]">{children}</div>
    </section>
  );
}

function Row({ href, icon: Icon, title, sub, badge, onClose }: { href: string; icon: LucideIcon; title: string; sub: string; badge?: string | null; onClose: () => void }) {
  return (
    <Link href={href} onClick={onClose} className="flex items-center gap-3.5 px-4 py-3.5 active:bg-[#F5F7FB]">
      <span className="w-11 h-11 rounded-[13px] bg-[#F1F4F9] text-[#3B4A6B] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-extrabold leading-tight">{title}</span>
        <span className="block mt-0.5 text-[13.5px] leading-snug text-[#5B667A]">{sub}</span>
      </span>
      {badge && <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#E8EEFF] text-[#2A4DD0] text-[12.5px] font-extrabold whitespace-nowrap">{badge}</span>}
      <ChevronRight className="w-5 h-5 text-[#9AA4B5] shrink-0" />
    </Link>
  );
}

/** The account and site menu behind the ☰ button in the phone headers. */
export function MenuSheet({ name, email, isSignedIn, onClose }: { name: string | null; email: string | null; isSignedIn: boolean; onClose: () => void }) {
  const info = useMenuInfo(isSignedIn);
  const initials = initialsOf(name);
  const upcoming = info && info !== "loading" ? info.upcoming : 0;

  const tiles: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/specialities", label: "Book a doctor", icon: Stethoscope },
    { href: "/diagnostics", label: "Book a test", icon: FlaskConical },
    isSignedIn ? { href: "/patient/records", label: "My records", icon: FileText } : { href: "/hospitals", label: "Hospitals", icon: Building2 },
  ];

  return (
    <Sheet title="Menu" onClose={onClose}>
      <nav aria-label="Account and site">
        {/* The account card: the patient's name and UHID, or Log in for visitors. */}
        {isSignedIn ? (
          <Link href="/patient/profile" onClick={onClose} className="flex items-center gap-3.5 rounded-[20px] bg-[#2A4DD0] text-white px-4 py-4 active:bg-[#2443BA]">
            <span className="w-[54px] h-[54px] rounded-full bg-white text-[#2A4DD0] flex items-center justify-center text-[19px] font-extrabold shrink-0">
              {initials || <UserRound className="w-6 h-6" strokeWidth={2.2} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[19px] font-extrabold leading-tight truncate">{name || "My account"}</span>
              {info === "loading" ? (
                <span aria-hidden className="block mt-1.5 h-3 w-28 rounded-full bg-white/20" />
              ) : (
                <span className="block mt-0.5 text-[13.5px] text-[#CFDCFF] truncate">{info ? `UHID ${info.uhid}` : email}</span>
              )}
            </span>
            <span className="flex items-center gap-0.5 text-[14.5px] font-bold shrink-0">
              View <ChevronRight className="w-4 h-4" strokeWidth={2.6} />
            </span>
          </Link>
        ) : (
          <Link href="/login/patient" onClick={onClose} className="flex items-center gap-3.5 rounded-[20px] bg-[#2A4DD0] text-white px-4 py-4 active:bg-[#2443BA]">
            <span className="w-[54px] h-[54px] rounded-full bg-white text-[#2A4DD0] flex items-center justify-center shrink-0">
              <LogIn className="w-6 h-6" strokeWidth={2.2} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[19px] font-extrabold leading-tight">Log in or sign up</span>
              <span className="block mt-0.5 text-[13.5px] text-[#CFDCFF]">See your bookings, passes and records</span>
            </span>
            <ChevronRight className="w-5 h-5 shrink-0" strokeWidth={2.6} />
          </Link>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {tiles.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose} className="flex flex-col items-center justify-center gap-2 min-h-[88px] px-1.5 py-3 rounded-[18px] bg-white shadow-[0_0_0_1px_#E3E8F0] text-center text-[14px] font-bold leading-tight active:bg-[#EEF3FF]">
              <Icon className="w-6 h-6 text-[#2A4DD0]" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>

        <Group label="Book care">
          {isSignedIn && <Row href="/patient/appointments" icon={CalendarDays} title="My appointments" sub="Upcoming visits, passes and history" badge={upcoming > 0 ? `${upcoming} upcoming` : null} onClose={onClose} />}
          <Row href="/specialities" icon={Stethoscope} title="Find a doctor" sub="Specialists at partner hospitals" onClose={onClose} />
          <Row href="/hospitals" icon={Building2} title="Hospitals" sub="Partner hospitals near you" onClose={onClose} />
          <Row href="/diagnostics" icon={FlaskConical} title="Lab tests" sub="Book tests at partner labs" onClose={onClose} />
        </Group>

        {isSignedIn && (
          <Group label="My health">
            {MY_HEALTH.filter((p) => p.key !== "emergency").map(({ key, href, label, icon }) => (
              <Row key={key} href={href} icon={icon} title={label} sub={HEALTH_SUB[key] ?? ""} onClose={onClose} />
            ))}
          </Group>
        )}

        {/* Emergency: the page with 108 and nearby emergency hospitals, or just the call for visitors. */}
        {(() => {
          const body = (
            <>
              <span className="w-11 h-11 rounded-[13px] bg-white text-[#D92D20] flex items-center justify-center shrink-0 shadow-[0_0_0_1px_#F7CFCB]">
                <Phone className="w-5 h-5" strokeWidth={2} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-extrabold leading-tight text-[#B42318]">Emergency</span>
                <span className="block mt-0.5 text-[13.5px] leading-snug text-[#C4320A]">{isSignedIn ? "Call 108 and find emergency hospitals" : "Call 108 for a free ambulance"}</span>
              </span>
              <ChevronRight className="w-5 h-5 text-[#E8857C] shrink-0" />
            </>
          );
          const cls = "mt-5 flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] bg-[#FEF3F2] shadow-[0_0_0_1px_#F7CFCB] active:bg-[#FDE7E5]";
          return isSignedIn ? (
            <Link href="/patient/emergency" onClick={onClose} className={cls}>
              {body}
            </Link>
          ) : (
            <a href="tel:108" className={cls}>
              {body}
            </a>
          );
        })()}

        {isSignedIn ? (
          <Group label="Account">
            <Row href="/patient/profile" icon={UserRound} title="Profile & settings" sub="Personal details and preferences" onClose={onClose} />
            <Row href="/patient/preferences" icon={Bell} title="Notifications" sub="Where booking slips and reports are sent" onClose={onClose} />
            <Row href="/patient/support" icon={LifeBuoy} title="Help & support" sub="Talk to the Consult your Doctor team" onClose={onClose} />
          </Group>
        ) : (
          <Group label="More">
            <Row href="/contact" icon={LifeBuoy} title="Help & support" sub="Talk to the Consult your Doctor team" onClose={onClose} />
            <Row href="/corporate" icon={Handshake} title="Partner with us" sub="For doctors, hospitals and labs" onClose={onClose} />
          </Group>
        )}
      </nav>

      {isSignedIn && (
        <form action="/auth/signout" method="post" className="mt-5">
          <button type="submit" className="w-full h-14 rounded-[20px] bg-white shadow-[0_0_0_1px_#E3E8F0] text-[#B42318] text-[16px] font-extrabold flex items-center justify-center gap-2 active:bg-[#FEF3F2]">
            <LogOut className="w-5 h-5" /> Log out
          </button>
        </form>
      )}
    </Sheet>
  );
}
