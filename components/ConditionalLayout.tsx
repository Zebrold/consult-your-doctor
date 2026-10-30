"use client";

import { usePathname } from "next/navigation";
import type React from "react";

// No Suspense boundary around this: usePathname() doesn't need one, and a fallback that renders the page's children
// made the server stream every page into the HTML twice (once in the fallback, once in the real layout).
// The public content pages (how it works, corporate, about, legal…) get the site header; the footer is the home
// page's alone.
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

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {header}
      <main className="flex-grow">{children}</main>
    </div>
  );
}
