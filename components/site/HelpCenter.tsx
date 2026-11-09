"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { HELP_TOPICS } from "@/lib/help-topics";

type Contact = { phone: string; phoneHref: string; email: string };

/**
 * The Help & Support questions, after the ContactDesk / ContactMobile designs. Desktops: a white card over the blue
 * hero with the topics down the left and the open topic's questions on the right. Phones: the topics as a row of
 * chips that scrolls sideways, then the questions.
 */
export function HelpCenter({ contact }: { contact: Contact }) {
  const [cat, setCat] = useState(0);
  const [open, setOpen] = useState(-1);
  const topic = HELP_TOPICS[cat];
  const pick = (i: number) => {
    setCat(i);
    setOpen(-1);
  };

  return (
    <section className="relative lg:-mt-[72px] lg:px-[calc(max(24px,10%)-40px)]">
      <div className="bg-white lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-14 lg:min-h-[640px] lg:pt-12 lg:pr-14 lg:pb-14 lg:pl-10 lg:shadow-[0_0_0_1px_#E6EBF3,0_20px_40px_rgba(11,27,63,0.08)]">
        {/* Desktop: the topics down the left */}
        <nav aria-label="Help topics" className="hidden lg:block self-stretch py-[22px] bg-[#EEF2F7]">
          {HELP_TOPICS.map((t, i) => {
            const on = i === cat;
            return (
              <button
                key={t.name}
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => pick(i)}
                className={`block w-[calc(100%-22px)] ml-[22px] py-[26px] pr-6 pl-[46px] text-left text-[16px] transition-colors ${
                  on ? "bg-white font-extrabold text-[#0B1B3F] shadow-[inset_3px_0_0_#1D4ED8]" : "font-semibold text-[#4A5878] hover:text-[#0B1B3F]"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </nav>

        {/* Phones: the topics as chips */}
        <div role="tablist" aria-label="Help topics" className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-[max(24px,10%)] pt-[18px] pb-1.5">
          {HELP_TOPICS.map((t, i) => {
            const on = i === cat;
            return (
              <button
                key={t.name}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pick(i)}
                className={`shrink-0 h-[38px] px-3.5 rounded-full border text-[13.5px] font-extrabold whitespace-nowrap transition-colors ${
                  on ? "bg-[#1D4ED8] border-[#1D4ED8] text-white" : "bg-white border-[#D6DDE8] text-[#27324A]"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <div className="px-4 md:px-[max(24px,10%)] pt-3.5 pb-2 lg:p-0 lg:pt-5 min-w-0">
          <h2 className="text-[21px] lg:text-[26px] font-extrabold lg:tracking-[-0.01em] lg:mb-1">{topic.name}</h2>
          {topic.items.map((f, i) => {
            const on = i === open;
            const id = `help-${cat}-${i}`;
            return (
              <div key={f.q} className="border-b border-[#E3E8F0]">
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={id}
                  onClick={() => setOpen(on ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 py-[18px] lg:py-6 text-left text-[15px] lg:text-[17px] font-medium leading-[1.45] text-[#27324A]"
                >
                  {f.q}
                  <ChevronDown className={`w-5 h-5 shrink-0 text-[#5B667A] transition-transform duration-200 ${on ? "rotate-180" : ""}`} strokeWidth={2} />
                </button>
                {on && (
                  <div id={id} className="-mt-1.5 lg:-mt-2.5 mb-[18px] lg:mb-6 max-w-[820px] text-[14px] lg:text-[15px] leading-[1.65] text-[#5B667A]">
                    <p>{f.a}</p>
                    {f.link && (
                      <Link href={f.link.href} className="inline-flex items-center gap-1.5 mt-2 font-extrabold text-[#1D4ED8] hover:underline underline-offset-4">
                        {f.link.label} <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <p className="mt-6 lg:mt-7 text-[14px] lg:text-[15px] leading-[1.6] text-[#4A5878]">
            Still need help? Call{" "}
            <a href={contact.phoneHref} className="font-extrabold text-[#1D4ED8] whitespace-nowrap hover:underline underline-offset-4">
              {contact.phone}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${contact.email}`} className="font-extrabold text-[#1D4ED8] hover:underline underline-offset-4">
              {contact.email}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
