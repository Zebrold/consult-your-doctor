"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Clean, authentic brand splash screen:
// Matches the exact header logo & wordmark in a horizontal lockup:
// [Stethoscope Logo Icon] Consult your Doctor
// Centered on solid brand royal blue (#1D4ED8).
// Gracefully scales up / zooms in smoothly and fades into the website.

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
    }, 1850);

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
    }, 250);
    return () => window.clearTimeout(t);
  }, [state]);

  if (!enabled || state === "gone") return null;

  return (
    <div
      aria-hidden
      className={`cyd-splash${state === "skip" ? " is-skipping" : ""}`}
      onClick={() => setState("skip")}
    >
      <div className="cyd-splash__lockup">
        <Image
          src="/logo-icon-white.png"
          alt=""
          width={96}
          height={96}
          priority
          className="cyd-splash__icon"
        />
        <span className="cyd-splash__title">Consult your Doctor</span>
      </div>
    </div>
  );
}
