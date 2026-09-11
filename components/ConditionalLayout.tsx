"use client";

import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function ConditionalLayoutInner({
  header,
  footer,
  children,
  isPatientLoggedIn,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  isPatientLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isPreviewPatient = pathname === "/" && searchParams.get("preview") === "patient";
  const isPatientHome = pathname === "/" && (isPatientLoggedIn || isPreviewPatient);

  const isDashboard =
    isPatientHome ||
    pathname?.startsWith("/hospital/dashboard") ||
    pathname?.startsWith("/executive/dashboard") ||
    pathname?.startsWith("/corporate/dashboard") ||
    pathname?.startsWith("/doctor/dashboard") ||
    pathname?.startsWith("/admin/dashboard") ||
    pathname?.startsWith("/diagnostic/dashboard") ||
    pathname?.startsWith("/patient") ||
    pathname?.startsWith("/find") ||
    pathname?.startsWith("/book") ||
    pathname?.startsWith("/doctors");

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col pt-[88px]">
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
    <Suspense fallback={<div className="min-h-screen flex flex-col pt-[88px]">{props.header}<main className="flex-grow">{props.children}</main>{props.footer}</div>}>
      <ConditionalLayoutInner {...props} />
    </Suspense>
  );
}
