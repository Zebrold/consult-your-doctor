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
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-variant py-2 px-6 flex justify-center items-center shadow-lg">
      <div className="max-w-md w-full flex justify-between items-center px-4">
        <Link
          href={homeHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-5 rounded-2xl transition-colors ${
            activeTab === "home"
              ? "bg-surface-container-high text-vibrant-blue font-bold"
              : "text-indigo-gray-600 hover:text-on-surface font-medium"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="font-label-sm text-[13px]">Home</span>
        </Link>
        <Link
          href={findHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-5 rounded-2xl transition-colors ${
            activeTab === "find"
              ? "bg-surface-container-high text-vibrant-blue font-bold"
              : "text-indigo-gray-600 hover:text-on-surface font-medium"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">search</span>
          <span className="font-label-sm text-[13px]">Find</span>
        </Link>
        <Link
          href={bookHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-5 rounded-2xl transition-colors ${
            activeTab === "book"
              ? "bg-surface-container-high text-vibrant-blue font-bold"
              : "text-indigo-gray-600 hover:text-on-surface font-medium"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}
          >
            calendar_month
          </span>
          <span className="font-label-sm text-[13px]">Book</span>
        </Link>
        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 px-5 rounded-2xl transition-colors ${
            activeTab === "profile"
              ? "bg-surface-container-high text-vibrant-blue font-bold"
              : "text-indigo-gray-600 hover:text-on-surface font-medium"
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">person</span>
          <span className="font-label-sm text-[13px]">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
