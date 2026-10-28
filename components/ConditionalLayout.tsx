"use client";

import { usePathname } from "next/navigation";
import type React from "react";

// No Suspense boundary around this: usePathname() doesn't need one, and a fallback that renders the page's children
// made the server stream every page into the HTML twice (once in the fallback, once in the real layout).
export function ConditionalLayout({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  isPatientLoggedIn?: boolean;
}) {
  const pathname = usePathname();

  const isDashboard =
    pathname === "/" ||
    pathname === "/ai" ||
    pathname?.startsWith("/hospital") ||
    pathname?.startsWith("/executive") ||
    pathname?.startsWith("/corporate") ||
    pathname?.startsWith("/doctor") ||
    pathname?.startsWith("/diagnostic") ||
    pathname?.startsWith("/patient") ||
    pathname?.startsWith("/find") ||
    pathname?.startsWith("/book") ||
    pathname?.startsWith("/specialities") ||
    pathname?.startsWith("/doctors");

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh flex flex-col pt-(--header-h)">
      {header}
      <main className="flex-grow">{children}</main>
      {footer}
    </div>
  );
}
