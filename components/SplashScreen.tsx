"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// The premium intro shown when opening the site:
// 1. The brand logo and name appear smoothly together in the center.
// 2. An elegant pulse and gleam flows across the mark.
// 3. Cinematic zoom-in (scale up) with an immersive iris mask / erase transition revealing the page.
// Plain CSS ensures immediate first paint with zero flicker, and session tracking hides it on subsequent pages.

const SEEN_KEY = "cyd-splash";

function markSeen() {
  document.documentElement.dataset.splash = "seen";
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode fallback
  }
}

export function SplashScreen({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<"show" | "skip" | "gone">("show");

  useEffect(() => {
    if (!enabled) {
      markSeen();
      return;
    }
    const done = window.setTimeout(() => {
      markSeen();
      setState("gone");
    }, 2100);

    const onKey = () => setState((s) => (s === "show" ? "skip" : s));
    window.addEventListener("keydown", onKey, { once: true });
    return () => {
      window.clearTimeout(done);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);

  useEffect(() => {
    if (state !== "skip") return;
    const t = window.setTimeout(() => {
      markSeen();
      setState("gone");
    }, 300);
    return () => window.clearTimeout(t);
  }, [state]);

  if (!enabled || state === "gone") return null;

  return (
    <div
      aria-hidden
      className={`cyd-splash${state === "skip" ? " is-skipping" : ""}`}
      onClick={() => setState("skip")}
    >
      <div className="cyd-splash__backdrop" />
      <div className="cyd-splash__stage">
        <div className="cyd-splash__brand">
          <div className="cyd-splash__icon-wrap">
            <div className="cyd-splash__aura" />
            <div className="cyd-splash__glow" />
            <Image
              src="/logo-icon-white.png"
              alt="Consult your Doctor"
              width={140}
              height={140}
              priority
              className="cyd-splash__icon"
            />
          </div>
          <div className="cyd-splash__word">
            <span>Consult your Doctor</span>
          </div>
          <div className="cyd-splash__tag">
            <span>Doctors · Hospitals · Lab Tests</span>
          </div>
        </div>
      </div>
    </div>
  );
}
