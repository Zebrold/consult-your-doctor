"use client";

import { usePathname } from "next/navigation";

export function ConditionalLayout({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isDashboard =
    pathname?.startsWith("/hospital/dashboard") ||
    pathname?.startsWith("/executive/dashboard") ||
    pathname?.startsWith("/corporate/dashboard") ||
    pathname?.startsWith("/doctor/dashboard") ||
    pathname?.startsWith("/admin/dashboard") ||
    pathname?.startsWith("/diagnostic/dashboard") ||
    pathname?.startsWith("/patient");

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
