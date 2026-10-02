"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, House, LogIn, Search, UserRound, type LucideIcon } from "lucide-react";

type Tab = "home" | "find" | "book" | "profile";

interface PatientDockProps {
  activeTab?: Tab;
  /** Pass false for signed-out visitors so the last tab offers sign-in instead of the profile. */
  isSignedIn?: boolean;
}

export function PatientDock({ activeTab = "home", isSignedIn = true }: PatientDockProps) {
  const searchParams = useSearchParams();
  const suffix = searchParams.get("preview") === "patient" ? "?preview=patient" : "";

  const tabs: { id: Tab; label: string; href: string; icon: LucideIcon }[] = [
    { id: "home", label: "Home", href: `/${suffix}`, icon: House },
    { id: "find", label: "Find", href: `/find${suffix}`, icon: Search },
    { id: "book", label: "Book", href: `/find${suffix}`, icon: CalendarDays },
    isSignedIn
      ? { id: "profile", label: "Profile", href: `/patient/profile${suffix}`, icon: UserRound }
      : { id: "profile", label: "Sign in", href: "/login/patient", icon: LogIn },
  ];

  return (
    <nav
      aria-label="Patient navigation"
      className="fixed z-50 bottom-0 inset-x-0 bg-surface/90 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,80,203,0.06)] pb-[env(safe-area-inset-bottom)] md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:border md:border-surface-container-high md:bg-surface-container-lowest/95 md:shadow-xl md:pb-0"
    >
      <div className="flex justify-around items-center h-20 px-4 md:h-auto md:gap-3 md:px-4 md:py-2">
        {tabs.map(({ id, label, href, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <Link
              key={id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-16 md:w-auto md:h-auto md:px-4 md:py-1.5 rounded-xl transition-colors ${
                active ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon className="w-6 h-6 md:w-[22px] md:h-[22px]" strokeWidth={active ? 2.3 : 1.8} />
              <span className={`text-label-sm md:text-[11px] leading-none ${active ? "font-bold" : "font-medium"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
