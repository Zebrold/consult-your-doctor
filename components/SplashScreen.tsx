"use client";

import { useEffect, useState } from "react";

// The intro shown when someone opens the site: the brand blue, the stethoscope drawing itself inside a ring, the name
// rising into place, then the screen lifts like a curtain onto the page. It is plain HTML and CSS (globals.css,
// .cyd-splash), so it paints with the first HTML and leaves by itself even without JavaScript. It shows once per
// browser session: the head script in app/layout.tsx marks <html data-splash="seen"> on later loads, which hides it
// before paint. People who ask for reduced motion never see it. A tap or a key skips it.

const SEEN_KEY = "cyd-splash";

/** From now on the intro stays hidden, also when navigating within the site remounts it. */
function markSeen() {
  document.documentElement.dataset.splash = "seen";
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private modes without storage simply see it again next time.
  }
}

/** `enabled` is false where the intro is never shown (staff portals, booking slips); opening the site there counts as seen. */
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
    }, 2300);
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
    }, 380);
    return () => window.clearTimeout(t);
  }, [state]);

  if (!enabled || state === "gone") return null;

  return (
    <div aria-hidden className={`cyd-splash${state === "skip" ? " is-skipping" : ""}`} onClick={() => setState("skip")}>
      <div className="cyd-splash__stage">
        <div className="cyd-splash__mark">
          <svg className="cyd-splash__ring" viewBox="0 0 112 112">
            <circle className="cyd-splash__track" cx="56" cy="56" r="53" />
            <circle className="cyd-splash__arc" cx="56" cy="56" r="53" pathLength={1} />
          </svg>
          <span className="cyd-splash__pulse" />
          <svg className="cyd-splash__logo" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path pathLength={1} d="M11 2v2" />
            <path pathLength={1} d="M5 2v2" />
            <path pathLength={1} d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
            <path pathLength={1} d="M8 15a6 6 0 0 0 12 0v-3" />
            <circle pathLength={1} cx="20" cy="10" r="2" />
          </svg>
        </div>
        <div className="cyd-splash__word">
          <span>Consult your Doctor</span>
        </div>
        <div className="cyd-splash__tag">Doctors · Hospitals · Lab tests</div>
      </div>
      <div className="cyd-splash__bar">
        <span />
      </div>
    </div>
  );
}
