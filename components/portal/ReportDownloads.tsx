'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { card } from './workspace-ui'

// "Download reports" on the staff Reports pages: each row is a CSV made in the browser from rows the page already
// loaded (Excel opens it), or a link to the page that has the file.

type Cell = string | number | null
export type ReportFile =
  | { title: string; sub: string; filename: string; rows: Cell[][] }
  | { title: string; sub: string; href: string; action: string }

// A leading = + - @ would make Excel run the cell as a formula; a quote keeps it as text.
const safe = (v: Cell) => {
  const s = v == null ? '' : String(v)
  const text = typeof v === 'string' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function download(filename: string, rows: Cell[][]) {
  // The byte-order mark makes Excel read the file as UTF-8 (₹, names in Indian scripts).
  const csv = '﻿' + rows.map((r) => r.map(safe).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ReportDownloads({ files, className = '' }: { files: ReportFile[]; className?: string }) {
  return (
    <section className={`${card} p-4 lg:p-[22px] ${className}`} aria-label="Download reports">
      <h2 className="mb-2 lg:mb-3.5 text-[16px] font-extrabold lg:tracking-[-0.01em]">Download reports</h2>
      <ul>
        {files.map((f) => {
          const empty = 'rows' in f && f.rows.length <= 1
          return (
            <li key={f.title + f.sub} className="flex items-center gap-3 py-3 border-t border-[#EEF2F7]">
              <FileText className="w-[19px] h-[19px] text-[#5B667A] shrink-0" strokeWidth={2} aria-hidden />
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-extrabold">{f.title}</span>
                <span className="block text-[12px] text-[#5B667A]">{empty ? `${f.sub} · nothing to download yet` : f.sub}</span>
              </span>
              {'rows' in f ? (
                <button
                  type="button"
                  disabled={empty}
                  onClick={() => download(f.filename, f.rows)}
                  className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4 disabled:text-[#98A2B3] disabled:no-underline"
                >
                  Download
                </button>
              ) : (
                <Link href={f.href} className="shrink-0 text-[13px] font-extrabold text-[#2A4DD0] hover:underline underline-offset-4">
                  {f.action}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
