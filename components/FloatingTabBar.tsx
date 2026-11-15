"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type FloatingTab = { href: string; label: string; icon: LucideIcon; active: boolean };

/** True while the page scrolls down (away from the top), false again as soon as it scrolls back up. */
function useScrollingDown() {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < 24) {
          setDown(false);
          last = y;
          return;
        }
        // Ignore the jitter of a resting finger and of the rubber-band bounce at the page's ends.
        if (Math.abs(y - last) < 8) return;
        setDown(y > last);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return down;
}

/**
 * The phones' tab bar (patient, doctor and hospital): a floating light-grey pill above the bottom edge with dark outline
 * icons, the current tab in a bright blue pill. While the page scrolls down it shrinks to its icons; scrolling up brings
 * the labels back. With the gap below it, it is as tall as the full-width bar it replaced, which the pages' bottom
 * padding leaves room for.
 */
export function FloatingTabBar({ tabs, label }: { tabs: FloatingTab[]; label: string }) {
  const compact = useScrollingDown();
  return (
    <div className="lg:hidden fixed z-40 inset-x-0 bottom-0 flex justify-center px-4 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none font-(family-name:--font-manrope) print:hidden">
      <nav
        aria-label={label}
        style={{ maxWidth: compact ? tabs.length * 62 + 8 : 460 }}
        className={`pointer-events-auto flex w-full rounded-full bg-[#F3F3F3]/95 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_0_0_1px_rgba(11,27,63,0.04),0_16px_34px_-12px_rgba(11,27,63,0.35)] transition-[max-width,padding] duration-300 ease-out ${compact ? "p-1" : "p-1.5"}`}
      >
        {tabs.map(({ href, label: name, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center rounded-full transition-[height,background-color,color] duration-300 ease-out ${compact ? "h-11" : "h-[56px]"} ${
              active ? "bg-[#2038EF] text-white shadow-[0_6px_14px_-4px_rgba(32,56,239,0.55)]" : "text-[#2F3542] active:bg-black/5"
            }`}
          >
            <Icon className="w-[23px] h-[23px] shrink-0" strokeWidth={1.8} />
            {/* Collapsed, not removed, so screen readers still read the tab's name. */}
            <span
              className={`max-w-full truncate text-[11.5px] leading-none transition-[max-height,opacity,margin] duration-300 ease-out ${active ? "font-bold" : "font-semibold text-[#101218]"} ${
                compact ? "max-h-0 mt-0 opacity-0" : "max-h-4 mt-[5px] opacity-100"
              }`}
            >
              {name}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
