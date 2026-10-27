"use client";

import { usePathname } from "next/navigation";
import React, { Suspense } from "react";

function ConditionalLayoutInner({
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

export function ConditionalLayout(props: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  isPatientLoggedIn?: boolean;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh flex flex-col pt-(--header-h)">{props.header}<main className="flex-grow">{props.children}</main>{props.footer}</div>}>
      <ConditionalLayoutInner {...props} />
    </Suspense>
  );
}
