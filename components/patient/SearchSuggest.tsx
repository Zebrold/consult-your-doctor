"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, FlaskConical, Search, Stethoscope, TestTube, UserRound, type LucideIcon } from "lucide-react";
import { SPECIALITIES } from "@/components/home/specialities";

// The search boxes' suggestions (app/api/search/suggest): as you type, matching specialities, doctors, hospitals,
// diagnostic centres and tests, each opening its page; Enter on your own words still searches everything (/find).
// Focused while empty, the box offers the popular specialities. Renders the input and the list; the list is placed
// under the enclosing form, so the form needs `relative`.

type Suggestion = { kind: "speciality" | "doctor" | "hospital" | "lab" | "test"; title: string; sub: string; href: string };

const ICON: Record<Suggestion["kind"], LucideIcon> = { speciality: Stethoscope, doctor: UserRound, hospital: Building2, lab: FlaskConical, test: TestTube };
const GROUP: Record<Suggestion["kind"], string> = { speciality: "Specialities", doctor: "Doctors", hospital: "Hospitals", lab: "Diagnostic centres", test: "Lab tests" };

const POPULAR: Suggestion[] = SPECIALITIES.slice(0, 6).map((s) => ({ kind: "speciality", title: s.name, sub: s.tagline, href: `/specialities/${s.slug}` }));

/** The title with the typed part in bold. */
function Marked({ text, q }: { text: string; q: string }) {
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-extrabold text-[#2A4DD0]">{text.slice(at, at + q.length)}</strong>
      {text.slice(at + q.length)}
    </>
  );
}

export function SearchSuggest({
  id,
  placeholder,
  defaultValue = "",
  inputClassName,
}: {
  id: string;
  placeholder: string;
  defaultValue?: string;
  inputClassName: string;
}) {
  const router = useRouter();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, Suggestion[]>());
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<{ q: string; items: Suggestion[] }>({ q: "", items: [] });
  const [active, setActive] = useState(-1);

  const q = value.trim();
  const typing = q.length >= 2;

  // Look the words up shortly after typing stops; only the latest answer is kept.
  useEffect(() => {
    if (!typing) return;
    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) {
      setFound({ q, items: cached });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items?: Suggestion[] };
        const items = Array.isArray(data.items) ? data.items : [];
        cacheRef.current.set(q.toLowerCase(), items);
        setFound({ q, items });
      } catch {
        // Aborted by the next keystroke, or offline: keep what is shown.
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, typing]);

  // Close when tapping or clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const items = useMemo(() => (typing ? (found.q === q ? found.items : found.items.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()))) : POPULAR), [typing, found, q]);
  // The last row searches everything for the words typed.
  const rows = typing ? items.length + 1 : items.length;
  const show = open && (typing || items.length > 0);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const allHref = `/find?q=${encodeURIComponent(q)}`;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (!rows) return;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % rows : i <= 0 ? rows - 1 : i - 1));
    } else if (e.key === "Enter" && show && active >= 0) {
      e.preventDefault();
      go(active < items.length ? items[active].href : allHref);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <>
      <input
        id={id}
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? optionId(active) : undefined}
        className={inputClassName}
      />
      <div ref={box} hidden={!show} className="absolute left-0 right-0 top-full mt-2 z-50">
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="max-h-[min(70vh,460px)] overflow-y-auto py-2 rounded-2xl bg-white text-[#0B1B3F] border border-[#E6EAF0] shadow-[0_18px_40px_-12px_rgba(11,27,63,0.28)] font-(family-name:--font-manrope)"
        >
          {!typing && <p className="px-4 pt-1.5 pb-1 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#7A8599]">Popular specialities</p>}
          {items.map((s, i) => {
            const Icon = ICON[s.kind];
            const groupStart = typing && (i === 0 || items[i - 1].kind !== s.kind);
            return (
              <div key={`${s.kind}-${s.href}`}>
                {groupStart && <p className={`px-4 pb-1 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#7A8599] ${i === 0 ? "pt-1.5" : "pt-3"}`}>{GROUP[s.kind]}</p>}
                <Link
                  id={optionId(i)}
                  role="option"
                  aria-selected={active === i}
                  href={s.href}
                  onClick={() => setOpen(false)}
                  onPointerEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${active === i ? "bg-[#F2F5FC]" : ""}`}
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-[#EEF3FF] text-[#2A4DD0] flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold">
                      <Marked text={s.title} q={typing ? q : ""} />
                    </span>
                    {s.sub && <span className="block truncate text-[12.5px] text-[#5B667A]">{s.sub}</span>}
                  </span>
                </Link>
              </div>
            );
          })}
          {typing && (
            <Link
              id={optionId(items.length)}
              role="option"
              aria-selected={active === items.length}
              href={allHref}
              onClick={() => setOpen(false)}
              onPointerEnter={() => setActive(items.length)}
              className={`flex items-center gap-3 px-4 py-3 mt-1 border-t border-[#EEF1F6] transition-colors ${active === items.length ? "bg-[#F2F5FC]" : ""}`}
            >
              <span className="shrink-0 w-9 h-9 rounded-xl bg-[#2A4DD0] text-white flex items-center justify-center">
                <Search className="w-[17px] h-[17px]" strokeWidth={2.3} />
              </span>
              <span className="min-w-0 truncate text-[14px] font-bold">
                {items.length ? "See all results for" : "Search for"} “{q}”
              </span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
