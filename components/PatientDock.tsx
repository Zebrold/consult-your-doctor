"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PatientDockProps {
  activeTab?: "home" | "find" | "book" | "profile";
}

export function PatientDock({ activeTab = "home" }: PatientDockProps) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "patient";

  const homeHref = isPreview ? "/?preview=patient" : "/";
  const findHref = isPreview ? "/find?preview=patient" : "/find";
  const bookHref = isPreview ? "/find?preview=patient" : "/find";
  const profileHref = isPreview ? "/patient/profile?preview=patient" : "/patient/profile";

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-1.5 px-4 flex justify-center items-center shadow-lg">
      <div className="max-w-md w-full flex justify-around items-center">
        <Link
          href={homeHref}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "home"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === "home" ? "'FILL' 1" : "'FILL' 0" }}
          >
            home
          </span>
          <span className="font-label-sm text-[12px] leading-tight">Home</span>
        </Link>

        <Link
          href={findHref}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "find"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === "find" ? "'wght' 700" : "'wght' 500" }}
          >
            search
          </span>
          <span className="font-label-sm text-[12px] leading-tight">Find</span>
        </Link>

        <Link
          href={bookHref}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "book"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === "book" ? "'FILL' 1" : "'FILL' 0" }}
          >
            calendar_month
          </span>
          <span className="font-label-sm text-[12px] leading-tight">Book</span>
        </Link>

        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "profile"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <span
            className="material-symbols-outlined text-[23px]"
            style={{ fontVariationSettings: activeTab === "profile" ? "'FILL' 1" : "'FILL' 0" }}
          >
            person
          </span>
          <span className="font-label-sm text-[12px] leading-tight">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
