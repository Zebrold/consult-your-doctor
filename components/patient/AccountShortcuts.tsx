"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LifeBuoy, SlidersHorizontal, Users, Wallet, type LucideIcon } from "lucide-react";

// The account pages as a row of tiles, styled like the specialty shortcuts on the home page. Phones get this in place
// of PatientSidebar's menu card; the current page's tile is the blue one.

const TILES: { href: string; label: string; icon: LucideIcon; tint: string }[] = [
  { href: "/patient/family", label: "Family", icon: Users, tint: "bg-[#eaf2ff] text-[#1e6bff]" },
  { href: "/patient/insurance", label: "Insurance", icon: Wallet, tint: "bg-[#e7f8ee] text-[#16a34a]" },
  { href: "/patient/saved", label: "Saved", icon: Heart, tint: "bg-[#ffecef] text-[#e11d48]" },
  { href: "/patient/preferences", label: "Settings", icon: SlidersHorizontal, tint: "bg-[#f3ecff] text-[#7c3aed]" },
  { href: "/patient/support", label: "Help", icon: LifeBuoy, tint: "bg-slate-100 text-slate-500" },
];

export function AccountShortcuts({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="My account" className={`md:hidden grid grid-cols-5 gap-1 ${className}`}>
      {TILES.map(({ href, label, icon: Icon, tint }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className="min-w-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
            <span className={`w-[54px] h-[54px] rounded-2xl flex items-center justify-center ${active ? "bg-vibrant-blue text-white shadow-[0_8px_16px_-6px_rgba(0,102,255,0.6)]" : tint}`}>
              <Icon className="w-6 h-6" strokeWidth={1.9} />
            </span>
            <span className={`w-full text-center text-[11px] min-[380px]:text-[11.5px] tracking-tight leading-tight truncate ${active ? "font-semibold text-vibrant-blue" : "font-medium text-slate-700"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
