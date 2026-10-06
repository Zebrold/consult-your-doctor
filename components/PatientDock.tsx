"use client";

import { useSearchParams } from "next/navigation";
import { BrainCircuit, CalendarDays, House, LogIn, Search, UserRound } from "lucide-react";
import { PillNav } from "@/components/portal/PillNav";

type Tab = "home" | "find" | "book" | "ai" | "profile";

interface PatientDockProps {
  activeTab?: Tab;
  /** Pass false for signed-out visitors so the last tab offers sign-in instead of the profile. */
  isSignedIn?: boolean;
  /** The patient's name, for the initials on the profile tab. */
  name?: string | null;
}

export function PatientDock({ activeTab = "home", isSignedIn = true, name }: PatientDockProps) {
  const searchParams = useSearchParams();
  const suffix = searchParams.get("preview") === "patient" ? "?preview=patient" : "";

  return (
    <PillNav
      label="Patient navigation"
      tabs={[
        { href: `/${suffix}`, label: "Home", icon: House, active: activeTab === "home" },
        { href: `/find${suffix}`, label: "Find", icon: Search, active: activeTab === "find" },
        { href: `/find${suffix}`, label: "Book", icon: CalendarDays, active: activeTab === "book" },
        { href: "/ai", label: "Zebrold AI", icon: BrainCircuit, ai: true, active: activeTab === "ai" },
        isSignedIn
          ? { href: `/patient/profile${suffix}`, label: "Profile", icon: UserRound, profile: true, avatar: { name }, active: activeTab === "profile" }
          : { href: "/login/patient", label: "Sign in", icon: LogIn, profile: true, active: activeTab === "profile" },
      ]}
    />
  );
}
