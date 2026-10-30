"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GetTheApp } from "@/components/GetTheApp";
import { DesktopAccount, PhoneAccountButton } from "@/components/home/HomeHero";
import type { HomeAccount } from "@/components/home/types";
import { MenuSheet } from "@/components/patient/PhoneSheet";
import { CorporateMenu } from "@/components/site/CorporateMenu";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/corporate#join", label: "Partner with Us" },
];

/**
 * The public pages' header, the home page's blue header in a slimmer band: the logo, the Corporate menu, How it works
 * and Partner with Us, Get the App and the account. Phones get the logo and the account menu.
 * Its height matches --header-h (globals.css), which sticky parts of the legal pages sit under.
 */
export function SiteHeader({ account }: { account: HomeAccount }) {
  const pathname = usePathname() ?? "/";
  const [menu, setMenu] = useState(false);
  const active = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50 bg-[#1D4ED8] text-white pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(255,255,255,0.08),0_8px_24px_-16px_rgba(11,27,63,0.6)] print:static print:shadow-none">
      <div className="h-16 md:h-20 px-4 md:px-[max(24px,10%)] flex items-center justify-between gap-4">
        <Link href="/" aria-label="Consult your Doctor home" className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
          <Image src="/logo-icon-white.png" alt="" width={96} height={96} priority className="w-9 h-9 md:w-[42px] md:h-[42px] object-contain shrink-0" />
          <span className="font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[19px] md:text-[25px] font-bold tracking-[-0.01em] truncate">Consult your Doctor</span>
        </Link>

        <nav aria-label="Main" className="hidden md:flex items-center gap-6 lg:gap-7 shrink-0">
          <div className="hidden lg:block">
            <CorporateMenu
              className={`text-[15px] font-semibold transition-colors ${pathname.startsWith("/corporate") || pathname.startsWith("/signup/") ? "text-white" : "text-white/90 hover:text-white"}`}
            />
          </div>
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`hidden lg:block text-[15px] font-semibold transition-colors ${active(l.href) ? "text-white underline decoration-2 underline-offset-[10px] decoration-[#A9CBFF]" : "text-white/90 hover:text-white"}`}
            >
              {l.label}
            </Link>
          ))}
          <GetTheApp variant="hero" />
          <DesktopAccount account={account} hasVisit={false} />
        </nav>

        <div className="md:hidden shrink-0">
          <PhoneAccountButton account={account} onMenu={() => setMenu(true)} />
        </div>
      </div>
      {menu && (
        <MenuSheet
          name={account.kind === "patient" ? account.name : null}
          email={account.kind === "patient" ? account.email : null}
          isSignedIn={account.kind === "patient"}
          onClose={() => setMenu(false)}
        />
      )}
    </header>
  );
}
