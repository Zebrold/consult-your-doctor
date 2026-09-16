"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Home, Search, Calendar, User } from "lucide-react";

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
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "home"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <Home
            className={`w-[22px] h-[22px] ${
              activeTab === "home" ? "stroke-[2.5] text-primary" : "stroke-[1.8] text-slate-600"
            }`}
          />
          <span className="font-label-sm text-[12px] leading-tight">Home</span>
        </Link>

        <Link
          href={findHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "find"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <Search
            className={`w-[22px] h-[22px] ${
              activeTab === "find" ? "stroke-[2.5] text-primary" : "stroke-[1.8] text-slate-600"
            }`}
          />
          <span className="font-label-sm text-[12px] leading-tight">Find</span>
        </Link>

        <Link
          href={bookHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "book"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <Calendar
            className={`w-[22px] h-[22px] ${
              activeTab === "book" ? "stroke-[2.5] text-primary" : "stroke-[1.8] text-slate-600"
            }`}
          />
          <span className="font-label-sm text-[12px] leading-tight">Book</span>
        </Link>

        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 sm:px-5 rounded-2xl transition-all ${
            activeTab === "profile"
              ? "bg-[#e8efff] text-primary font-bold shadow-xs scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 font-medium"
          }`}
        >
          <User
            className={`w-[22px] h-[22px] ${
              activeTab === "profile" ? "stroke-[2.5] text-primary" : "stroke-[1.8] text-slate-600"
            }`}
          />
          <span className="font-label-sm text-[12px] leading-tight">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
