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
import { PartnerMenu } from "@/components/site/PartnerMenu";

const NAV = [{ href: "/corporate#join", label: "Partner with Us" }];

/**
 * The public pages' header, the home page's blue header in a slimmer band: the logo, the Corporate menu, Partner with
 * Us, Get the App and the account. Phones get the logo and the account menu.
 * Its height matches --header-h (globals.css), which sticky parts of the legal pages sit under. On phones it sticks
 * just under the "Open in app" strip (--strip-h), except on the partner page, where it scrolls away with the page.
 */
export function SiteHeader({ account }: { account: HomeAccount }) {
  const pathname = usePathname() ?? "/";
  const [menu, setMenu] = useState(false);
  // The partner page scrolls with its header (the user asked for it not to stay pinned there), and its Login menu
  // lists only the partner portals.
  const partnerPage = pathname === "/corporate" || pathname.startsWith("/corporate/") || pathname.startsWith("/signup/");
  const pinned = !(pathname === "/corporate" || pathname.startsWith("/corporate/"));
  const active = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header data-static-header={pinned ? undefined : ""} className={`${pinned ? "sticky top-(--strip-h)" : "relative"} z-50 bg-[#1D4ED8] text-white pt-[env(safe-area-inset-top)] print:static print:shadow-none`}>
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
          <div className="hidden lg:block">
            <PartnerMenu
              className={`text-[15px] font-semibold transition-colors ${pathname.startsWith("/corporate") || pathname.startsWith("/signup/") ? "text-white" : "text-white/90 hover:text-white"}`}
            />
          </div>
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
