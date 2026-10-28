"use client";

import type { ReactNode } from "react";
import { TopBar } from "@/components/portal/TopBar";
import { PATIENT_ACCOUNT_LINKS, PhoneHeader } from "@/components/patient/PhoneHeader";

interface PatientNavHeaderProps {
  name?: string | null;
  email?: string | null;
  isSignedIn?: boolean;
  /** Adds a back arrow. */
  backHref?: string;
  /** Width and side padding, to line up with the page below. */
  container?: string;
  /** Extra classes for the white bar (pages without the blue header). */
  className?: string;
  /** Gives the page the home page's blue header with this title, at every screen size. */
  title?: string;
  /** The blue header without a title, for pages that need the room (Zebrold AI). */
  blue?: boolean;
  /** Above the title in the blue header. */
  eyebrow?: string;
  /** Under the title in the blue header. */
  subtitle?: ReactNode;
  /** Inside the blue header, under the title: a search box, stat tiles. */
  hero?: ReactNode;
  /** Leave the blue header out on desktops, for pages that show their own title there. */
  deskHidden?: boolean;
}

/** The patient pages' header: the blue app header (with a title), or the white bar with the logo and the account. */
export function PatientNavHeader({
  name, email, isSignedIn = false, backHref, container = "max-w-[1240px] px-margin-x-mobile lg:px-12", className = "", title, blue = !!title, eyebrow, subtitle, hero, deskHidden,
}: PatientNavHeaderProps) {
  if (blue) {
    return (
      <PhoneHeader title={title} eyebrow={eyebrow} subtitle={subtitle} backHref={backHref} isSignedIn={isSignedIn} name={name} email={email} container={container} deskHidden={deskHidden}>
        {hero}
      </PhoneHeader>
    );
  }
  return (
    <TopBar
      homeHref="/"
      section=""
      person={isSignedIn ? { name: name || "", role: "Patient", detail: email } : null}
      links={PATIENT_ACCOUNT_LINKS}
      backHref={backHref}
      container={container}
      className={className}
    />
  );
}
