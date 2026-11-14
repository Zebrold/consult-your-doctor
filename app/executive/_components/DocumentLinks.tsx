'use client'

import { Check, FileText } from 'lucide-react'

type DocLink = { key: string; label: string; url: string | null }

// An application's uploaded documents (registration certificate, PAN card, ...), each opening in a new tab through a
// 10-minute signed link. Reloading the page makes fresh links.
export function DocumentLinks({ links }: { links: DocLink[] | undefined }) {
  if (!links || links.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="mr-1 text-[11.5px] font-extrabold tracking-[0.06em] uppercase text-[#5B667A]">Documents</span>
      {links.map((doc) =>
        doc.url ? (
          <a
            key={doc.key}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg bg-[#F4F6FA] shadow-[inset_0_0_0_1px_#E6EAF0] text-[12.5px] font-bold text-[#27324A] hover:text-[#2A4DD0]"
          >
            <FileText className="w-3.5 h-3.5 text-[#2A4DD0]" /> {doc.label}
          </a>
        ) : (
          <span key={doc.key} className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg bg-[#F4F6FA] text-[12.5px] font-bold text-[#5B667A]">
            <FileText className="w-3.5 h-3.5" /> {doc.label} (could not open; reload)
          </span>
        ),
      )}
    </div>
  )
}

/**
 * "Check the documents": each upload with a View link and a tick the reviewer sets after reading it. The ticks only
 * live on this screen; they make sure nobody approves without opening every document.
 */
export function DocumentChecklist({ links, checked, onToggle }: { links: DocLink[]; checked: (key: string) => boolean; onToggle: (key: string) => void }) {
  const done = links.filter((d) => checked(d.key)).length
  return (
    <div className="mt-4">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#5B667A]">Check the documents</span>
        <span className={`text-[12.5px] font-extrabold ${done === links.length ? 'text-[#067647]' : 'text-[#5B667A]'}`}>
          {done} of {links.length}
        </span>
      </span>
      <ul>
        {links.map((doc) => {
          const on = checked(doc.key)
          return (
            <li key={doc.key} className="flex items-center gap-3 py-2.5 border-t border-[#EEF2F7]">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`Checked ${doc.label}`}
                onClick={() => onToggle(doc.key)}
                className={`shrink-0 w-[22px] h-[22px] rounded-md flex items-center justify-center ${on ? 'bg-[#2A4DD0] text-white' : 'bg-white shadow-[inset_0_0_0_1.5px_#C3CCDA]'}`}
              >
                {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </button>
              <span className="flex-1 min-w-0 text-[13.5px] font-bold truncate">{doc.label}</span>
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                  View
                </a>
              ) : (
                <span className="shrink-0 text-[12px] text-[#5B667A]">Could not open; reload</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
