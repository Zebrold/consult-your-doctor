"use client";

import type { ReactNode } from "react";
import { CalendarDays, LifeBuoy, UserRound } from "lucide-react";
import { TopBar } from "@/components/portal/TopBar";
import { PhoneHeader } from "@/components/patient/PhoneHeader";

interface PatientNavHeaderProps {
  name?: string | null;
  email?: string | null;
  isSignedIn?: boolean;
  /** Adds a back arrow on phones. */
  backHref?: string;
  /** Width and side padding, to line up with the page below. */
  container?: string;
  className?: string;
  /** Gives phones the home page's blue header with this title, in place of the white bar. */
  title?: string;
  /** The blue header without a title, for pages that need the room (Zebrold AI). */
  blue?: boolean;
  /** Above the title in the blue header. */
  eyebrow?: string;
  /** Under the title in the blue header. */
  subtitle?: ReactNode;
  /** Inside the blue header, under the title: a search box, stat tiles. */
  hero?: ReactNode;
}

/** The patient pages' top bar: the logo and company name, and the account or a Sign in button. */
export function PatientNavHeader({
  name, email, isSignedIn = false, backHref, container = "max-w-[1240px] px-margin-x-mobile lg:px-12", className = "", title, blue = !!title, eyebrow, subtitle, hero,
}: PatientNavHeaderProps) {
  return (
    <>
      <TopBar
        homeHref="/"
        section=""
        person={isSignedIn ? { name: name || "", role: "Patient", detail: email } : null}
        links={[
          { href: "/patient/appointments", label: "My appointments", icon: <CalendarDays /> },
          { href: "/patient/profile", label: "My profile", icon: <UserRound /> },
          { href: "/patient/support", label: "Help & support", icon: <LifeBuoy /> },
        ]}
        backHref={backHref}
        container={container}
        className={blue ? `hidden md:block ${className}` : className}
      />
      {blue && (
        <PhoneHeader title={title} eyebrow={eyebrow} subtitle={subtitle} backHref={backHref} isSignedIn={isSignedIn} name={name} email={email}>
          {hero}
        </PhoneHeader>
      )}
    </>
  );
}
