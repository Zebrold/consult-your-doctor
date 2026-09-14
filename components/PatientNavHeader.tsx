"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PatientNavHeaderProps {
  title: string;
  user?: any;
  profile?: any;
  showBack?: boolean;
  onBack?: () => void;
  backHref?: string;
}

export function PatientNavHeader({
  title,
  user,
  profile,
  showBack,
  onBack,
  backHref,
}: PatientNavHeaderProps) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const homeHref = isPreview ? "/?preview=patient" : "/";
  const findHref = isPreview ? "/find?preview=patient" : "/find";
  const bookHref = isPreview ? "/find?preview=patient" : "/find";
  const profileHref = isPreview ? "/patient/profile?preview=patient" : "/patient/profile";
  const appointmentsHref = isPreview ? "/patient/appointments?preview=patient" : "/patient/appointments";

  const fullName = profile?.full_name || user?.user_metadata?.full_name || "Sarah Jenkins";
  const email = profile?.email || user?.email || "patient@example.com";

  return (
    <>
      {/* TOP MOBILE APP HEADER */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 h-14 px-4 flex items-center justify-between shadow-xs">
        {/* Left: Hamburger Menu + (Optional Back Arrow) + Title */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Open Navigation Menu"
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          {showBack && (
            backHref ? (
              <Link
                href={backHref}
                aria-label="Back to Profile"
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to Profile"
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
            )
          )}

          <h1 className="font-headline-lg text-[18px] font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-xs">
            {title}
          </h1>
        </div>

        {/* Right User Avatar Button */}
        <Link
          href={profileHref}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          title="Patient Profile"
        >
          <span className="material-symbols-outlined text-[19px]">person</span>
        </Link>
      </header>

      {/* SLIDE-OVER MOBILE DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer User Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                    <span className="material-symbols-outlined text-[22px]">person</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {fullName}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Drawer"
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/60"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="p-3 space-y-1">
                <Link
                  href={homeHref}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px] text-primary">home</span>
                  <span>Home Dashboard</span>
                </Link>

                <Link
                  href={findHref}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px] text-primary">search</span>
                  <span>Find Specialists &amp; Care</span>
                </Link>

                <Link
                  href={appointmentsHref}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px] text-primary">calendar_month</span>
                  <span>My Appointments</span>
                </Link>

                <Link
                  href={profileHref}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px] text-primary">person</span>
                  <span>Patient Profile &amp; Records</span>
                </Link>

                <div className="pt-2 pb-1 border-t border-slate-100 my-1"></div>

                <Link
                  href={isPreview ? "/patient/saved?preview=patient" : "/patient/saved"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">bookmark</span>
                  <span>Saved Doctors &amp; Centers</span>
                </Link>

                <Link
                  href={isPreview ? "/patient/family?preview=patient" : "/patient/family"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">diversity_1</span>
                  <span>Family &amp; Dependents</span>
                </Link>

                <Link
                  href={isPreview ? "/patient/insurance?preview=patient" : "/patient/insurance"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">receipt_long</span>
                  <span>Insurance &amp; Billing</span>
                </Link>

                <Link
                  href={isPreview ? "/patient/support?preview=patient" : "/patient/support"}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">help</span>
                  <span>Help &amp; Support FAQs</span>
                </Link>
              </nav>
            </div>

            {/* Drawer Sign Out Footer */}
            <div className="p-4 border-t border-slate-100">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Log Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
