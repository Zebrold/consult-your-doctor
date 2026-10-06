"use client";

import { CalendarDays, LifeBuoy, UserRound } from "lucide-react";
import { TopBar } from "@/components/portal/TopBar";

interface PatientNavHeaderProps {
  name?: string | null;
  email?: string | null;
  isSignedIn?: boolean;
  /** Adds a back arrow on phones. */
  backHref?: string;
  /** Width and side padding, to line up with the page below. */
  container?: string;
  className?: string;
}

/** The patient pages' top bar: the logo and company name, and the account or a Sign in button. */
export function PatientNavHeader({ name, email, isSignedIn = false, backHref, container = "max-w-[1240px] px-margin-x-mobile lg:px-12", className }: PatientNavHeaderProps) {
  return (
    <TopBar
      homeHref="/"
      section="Patient Portal"
      person={isSignedIn ? { name: name || "", role: "Patient", detail: email } : null}
      links={[
        { href: "/patient/appointments", label: "My appointments", icon: <CalendarDays /> },
        { href: "/patient/profile", label: "My profile", icon: <UserRound /> },
        { href: "/patient/support", label: "Help & support", icon: <LifeBuoy /> },
      ]}
      backHref={backHref}
      container={container}
      className={className}
    />
  );
}
