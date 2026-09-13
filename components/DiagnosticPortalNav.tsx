"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

interface DiagnosticPortalNavProps {
  centerName: string;
  centerCity: string;
  directorName: string;
  children: React.ReactNode;
}

export function DiagnosticPortalNav({
  centerName,
  centerCity,
  directorName,
  children,
}: DiagnosticPortalNavProps) {
  const pathname = usePathname();
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const navItems = [
    {
      label: "Dashboard",
      icon: "grid_view",
      href: "/diagnostic-center/dashboard",
      exact: true,
    },
    {
      label: "Test Catalog & Fee Schedule",
      icon: "inventory_2",
      href: "/diagnostic-center/tests",
    },
    {
      label: "Patient Directory",
      icon: "person_search",
      href: "/diagnostic-center/patients",
    },
    {
      label: "Test Bookings",
      icon: "calendar_month",
      href: "/diagnostic-center/dashboard#queueTable",
    },
    {
      label: "Upload & Dispatch Reports",
      icon: "description",
      href: "/diagnostic-center/reports",
    },
    {
      label: "Equipment Telemetry",
      icon: "sensors",
      href: "/diagnostic-center/dashboard#workstations",
    },
    {
      label: "Settings",
      icon: "tune",
      href: "/diagnostic-center/settings",
    },
  ];

  const isNavActive = (href: string, exact?: boolean) => {
    const cleanHref = href.split("#")[0];
    if (exact || cleanHref === "/diagnostic-center/dashboard") {
      return pathname === cleanHref && !href.includes("#");
    }
    if (cleanHref === "/diagnostic-center/tests") {
      return pathname.startsWith("/diagnostic-center/tests");
    }
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden xl:flex fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex-col justify-between border-r border-surface-container/60">
        <div className="flex flex-col">
          {/* Brand Header */}
          <Link href="/" className="h-16 px-gutter flex items-center gap-stack-sm hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-[0_4px_12px_rgba(0,102,255,0.18)]">
              <span className="material-symbols-outlined text-[20px]">biotech</span>
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-[17px] font-bold text-on-surface leading-tight tracking-tight">
                Consult Your Doctor
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Diagnostics Hub
              </span>
            </div>
          </Link>

          {/* LIMS / PACS Status Badge */}
          <div className="px-gutter mt-stack-md">
            <div className="px-stack-sm py-base rounded-full bg-secondary-container/20 flex items-center justify-between border border-secondary-container/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fresh-teal animate-pulse"></span>
                <span className="font-label-sm text-[11px] font-bold text-on-secondary-container">
                  LIMS / PACS Online
                </span>
              </div>
              <span className="font-label-sm text-[10px] font-semibold text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container">
                FHIR R4
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 px-stack-sm mt-stack-md">
            {navItems.map((item) => {
              const active = isNavActive(item.href, item.exact);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-stack-sm px-stack-md py-stack-sm transition-all rounded-xl ${
                    active
                      ? "bg-primary-container text-on-primary-container font-bold shadow-sm shadow-primary-container/20"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 500" }}
                  >
                    {item.icon}
                  </span>
                  <span className="font-body-md text-[14px] leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Hub Connection */}
        <div className="p-stack-md border-t border-surface-container/60 space-y-3">
          <div className="p-stack-sm rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container/80">
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
                Hub Connection
              </span>
              <span className="font-body-md text-[13px] font-semibold text-on-surface">
                Central Station #04
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-fresh-teal shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-label-sm font-semibold text-soft-coral hover:bg-soft-coral/10 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out Hub</span>
            </button>
          </form>
        </div>
      </aside>

      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 xl:left-72 right-0 h-16 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-4 sm:px-8 xl:px-margin-x-desktop border-b border-surface-container/60">
        <div className="flex items-center gap-stack-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant border border-surface-container/80">
            <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
            <span className="font-label-sm text-[12px] font-semibold truncate max-w-[200px] sm:max-w-xs">
              {centerName} • {centerCity}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-stack-md">
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/diagnostic-center/patients"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary font-label-sm text-[12px] font-bold shadow-[0_4px_12px_rgba(0,102,255,0.18)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">person_add</span>
              <span>New Patient Intake</span>
            </Link>
            <Link
              href="/diagnostic-center/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-fresh-teal text-on-primary font-label-sm text-[12px] font-bold shadow-[0_4px_12px_rgba(20,184,166,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">upload_file</span>
              <span>Upload Test Report</span>
            </Link>
          </div>

          <div className="hidden sm:block w-px h-6 bg-outline-variant/40"></div>

          <button
            type="button"
            aria-label="Notifications"
            onClick={() => showToast("PACS System Stream Alert", "All diagnostic feeds & telemetry operational.")}
            className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-soft-coral"></span>
          </button>

          <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-label-sm text-[13px] font-bold text-on-surface leading-tight">
                {directorName}
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
                Center Director
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-label-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="xl:pl-72 pt-16 pb-24 xl:pb-12 min-h-screen bg-surface">
        {children}
      </div>

      {/* MOBILE ACTIVE DOCK (Fixed Bottom Navigation Bar) */}
      <nav className="xl:hidden fixed bottom-3 left-4 right-4 z-50 max-w-lg mx-auto bg-surface-container-lowest/90 backdrop-blur-xl border border-surface-container shadow-2xl rounded-full py-2 px-4 flex justify-between items-center">
        {navItems.map((item) => {
          const active = isNavActive(item.href, item.exact);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-2xl transition-all ${
                active
                  ? "bg-primary-container text-on-primary-container font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface font-medium"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 500" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] leading-tight tracking-tight">
                {item.label === "Test Catalog & Fee Schedule" ? "Catalog" : item.label === "Upload & Dispatch Reports" ? "Reports" : item.label === "Equipment Telemetry" ? "Telemetry" : item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-20 xl:bottom-6 right-6 z-50 transition-all duration-300 pointer-events-none animate-in fade-in slide-in-from-bottom-5">
          <div className="px-4 py-3 rounded-xl bg-on-background text-on-primary shadow-2xl flex items-center gap-3 border border-outline-variant/20">
            <span className="material-symbols-outlined text-fresh-teal text-[22px]">
              check_circle
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[13px] font-bold">{toast.title}</span>
              <span className="font-label-sm text-[11px] text-outline-variant">{toast.sub}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
