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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  // 4 Bottom Navigation Bar tabs as shown in the design
  const bottomTabs = [
    {
      label: "Dashboard",
      icon: "dashboard",
      href: "/diagnostic-center/dashboard",
    },
    {
      label: "Patients",
      icon: "group",
      href: "/diagnostic-center/patients",
    },
    {
      label: "Add Test",
      icon: "add_circle_outline",
      href: "/diagnostic-center/tests",
    },
    {
      label: "Upload Report",
      icon: "upload_file",
      href: "/diagnostic-center/reports",
    },
  ];

  const isTabActive = (href: string) => {
    if (href === "/diagnostic-center/dashboard") {
      return pathname === "/diagnostic-center/dashboard" || pathname === "/diagnostic-center";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans flex flex-col">
      {/* MOBILE HEADER (Reference Image Match) */}
      <header className="md:hidden sticky top-0 z-40 w-full bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button type="button" className="text-slate-800 p-1 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">menu</span>
            </button>
            <span className="font-bold text-[20px] text-slate-900 tracking-tight">
              {(() => {
                if (pathname.includes("patients")) return "Patients";
                if (pathname.includes("tests")) return "Tests";
                if (pathname.includes("reports")) return "Reports";
                if (pathname.includes("settings")) return "Settings";
                return "Dashboard";
              })()}
            </span>
          </div>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-[#1A64FA] text-white flex items-center justify-center cursor-pointer shadow-sm"
              aria-label="User profile"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-slate-100 mb-2">
                  <p className="font-bold text-slate-900 text-sm">{directorName}</p>
                  <p className="text-xs text-slate-500">{centerName}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Node #042 Active
                  </span>
                </div>
                <Link
                  href="/diagnostic-center/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">tune</span>
                  Center Settings
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DESKTOP HEADER (Existing CYD Labs header) */}
      <header className="hidden md:block sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Header */}
          <Link href="/diagnostic-center/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]">science</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[17px] text-slate-900 tracking-tight leading-none">
                  CYD Labs
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[#A7F3D0] text-[#065F46] tracking-wider uppercase">
                  M3 READY
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>NABL Accr. Node #042</span>
              </div>
            </div>
          </Link>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell with Badge */}
            <button
              type="button"
              onClick={() =>
                showToast(
                  "Real-time Triage Alert",
                  "PACS node linked. All telemetry streams are active."
                )
              }
              className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>

            {/* Profile Avatar Circle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label="User profile"
              >
                <span className="material-symbols-outlined text-[22px]">person</span>
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 mb-2">
                    <p className="font-bold text-slate-900 text-sm">{directorName}</p>
                    <p className="text-xs text-slate-500">{centerName}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Node #042 Active
                    </span>
                  </div>
                  <Link
                    href="/diagnostic-center/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">tune</span>
                    Center Settings
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Sign Out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-28">
        {children}
      </div>

      {/* WORKING BOTTOM NAVBAR WITH ACTIVE COLORS (Fixed bottom mobile & desktop navigation dock) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-2 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {bottomTabs.map((tab) => {
            const active = isTabActive(tab.href);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                  active
                    ? "text-[#0066FF] scale-105"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[24px] transition-transform duration-200"
                  style={{
                    fontVariationSettings: active
                      ? "'FILL' 1, 'wght' 600"
                      : "'FILL' 0, 'wght' 500",
                    color: active ? "#0066FF" : "currentColor",
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight transition-colors ${
                    active ? "font-bold text-[#0066FF]" : "font-medium text-slate-500"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="px-4 py-2.5 rounded-full bg-slate-900 text-white shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{toast.title}:</span>
            <span className="text-slate-300 font-normal">{toast.sub}</span>
          </div>
        </div>
      )}
    </div>
  );
}
