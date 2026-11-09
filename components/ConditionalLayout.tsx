"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { AppPromoStrip } from "@/components/home/AppPromo";
import { SplashScreen } from "@/components/SplashScreen";

// No Suspense boundary around this: usePathname() doesn't need one, and a fallback that renders the page's children
// made the server stream every page into the HTML twice (once in the fallback, once in the real layout).
// The public content pages (how it works, corporate, about, legal…) get the site header; the footer is the home
// page's alone.

// Staff workspaces and staff logins don't get the phone's "Open in app" strip: the app is for patients.
const NO_APP_STRIP = ["/hospital", "/doctor", "/executive", "/diagnostic-center", "/login/hospital", "/login/doctor", "/login/diagnostic", "/login/executive"];
const inSection = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function ConditionalLayout({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isDashboard =
    pathname === "/" ||
    pathname === "/ai" ||
    pathname?.startsWith("/hospital") ||
    pathname?.startsWith("/executive") ||
    pathname?.startsWith("/doctor") ||
    pathname?.startsWith("/diagnostic") ||
    pathname?.startsWith("/patient") ||
    pathname?.startsWith("/find") ||
    pathname?.startsWith("/search") ||
    pathname?.startsWith("/book") ||
    pathname?.startsWith("/specialities") ||
    pathname?.startsWith("/doctors");

  // Phones: the app strip on every patient and public page, stuck to the top while the page scrolls. Sticky headers
  // below it sit at top: var(--strip-h) (globals.css).
  const staffArea = NO_APP_STRIP.some((base) => inSection(pathname ?? "", base));
  const strip = staffArea ? null : <AppPromoStrip />;
  // The opening intro, for people opening the site (not staff, who open their portal all day, nor a booking slip
  // opened at the desk or from WhatsApp, which should show at once).
  const splash = <SplashScreen enabled={!staffArea && !inSection(pathname ?? "", "/book/confirmation")} />;

  if (isDashboard) {
    return (
      <>
        {splash}
        {strip}
        {children}
      </>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {splash}
      {strip}
      {header}
      <main className="flex-grow">{children}</main>
    </div>
  );
}
