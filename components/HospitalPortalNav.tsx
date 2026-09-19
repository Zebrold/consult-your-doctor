"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { Building2 } from 'lucide-react';

interface HospitalPortalNavProps {
  hospitalName: string;
  adminName: string;
  children: React.ReactNode;
}

export function HospitalPortalNav({
  hospitalName,
  adminName,
  children,
}: HospitalPortalNavProps) {
  const pathname = usePathname();
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const bottomTabs = [
    {
      label: "Overview",
      icon: "dashboard",
      href: "/hospital/dashboard",
    },
    {
      label: "Doctors",
      icon: "medical_services",
      href: "/hospital/doctors",
    },
    {
      label: "Patients",
      icon: "group",
      href: "/hospital/patients",
    },
    {
      label: "Revenue",
      icon: "payments",
      href: "/hospital/revenue",
    },
  ];

  const isTabActive = (href: string) => {
    if (href === "/hospital/dashboard") {
      return pathname === "/hospital/dashboard" || pathname === "/hospital";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans flex flex-col">
      {/* UNIFIED HEADER (MATCHING PATIENT/DOCTOR DASHBOARDS) */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 h-14 px-4 flex items-center justify-between shadow-xs">
        {/* Left: Hamburger Menu + Title */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Open Navigation Menu"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <h1 className="font-headline-lg text-[18px] font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-xs capitalize">
            {(() => {
              if (pathname.includes("doctors")) return "Doctors";
              if (pathname.includes("patients")) return "Patients";
              if (pathname.includes("revenue")) return "Revenue";
              return "Dashboard";
            })()}
          </h1>
        </div>

        {/* Right User Avatar Button & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full bg-[#0949B3] flex items-center justify-center text-white shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title="Admin Profile"
          >
            <span className="material-symbols-outlined text-[19px]">person</span>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl bg-white border border-slate-100 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100 mb-2">
                <p className="font-bold text-slate-900 text-sm truncate">{hospitalName}</p>
                <p className="text-xs text-slate-500 truncate">{adminName}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-[#0949B3] bg-blue-50 px-2 py-0.5 rounded-full">
                  Admin Privileges Active
                </span>
              </div>
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
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-28">
        {children}
      </div>

      {/* FIXED BOTTOM NAVIGATION DOCK */}
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
                    ? "text-[#0949B3] scale-105"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[24px] transition-transform duration-200"
                  style={{
                    fontVariationSettings: active
                      ? "'FILL' 1, 'wght' 600"
                      : "'FILL' 0, 'wght' 500",
                    color: active ? "#0949B3" : "currentColor",
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight transition-colors ${
                    active ? "font-bold text-[#0949B3]" : "font-medium text-slate-500"
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
