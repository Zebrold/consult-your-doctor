"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { AppPromoStrip } from "@/components/home/AppPromo";

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
  const strip = NO_APP_STRIP.some((base) => inSection(pathname ?? "", base)) ? null : <AppPromoStrip />;

  if (isDashboard) {
    return (
      <>
        {strip}
        {children}
      </>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {strip}
      {header}
      <main className="flex-grow">{children}</main>
    </div>
  );
}
