'use client'

import { useState, useEffect } from 'react'
import { CircleAlert, Copy, Check, X, Database } from 'lucide-react'

export function BedSyncNotice() {
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('dismissed_bed_notice') === 'true') {
      setDismissed(true)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dismissed_bed_notice', 'true')
    }
  }

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText('supabase/migrations/20261009_beds_reviews_profiles.sql')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (dismissed) return null

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/80 border border-blue-200/80 text-blue-950 text-[13px] flex items-start justify-between gap-3 shadow-sm transition-all">
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-[#0066ff] flex items-center justify-center shrink-0 border border-blue-200/60 mt-0.5">
          <Database className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-[14px] text-blue-950">
              Bed Allocation Active (High-Availability Mode)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              Fully Operational
            </span>
          </div>
          <p className="text-[12px] text-blue-800/90 mt-1 leading-relaxed">
            Your inpatient bed allocation board and admissions are running with real-time in-memory persistence. To synchronize with Supabase PostgreSQL, execute the migration file in your Supabase SQL editor.
          </p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={copyPath}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 text-xs font-semibold shadow-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
              {copied ? 'Migration Path Copied!' : 'Copy Migration File Path'}
            </button>
            <span className="text-[11px] font-mono text-blue-700 bg-blue-100/60 px-2 py-1 rounded">
              supabase/migrations/20261009_beds_reviews_profiles.sql
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0 border border-blue-200/60 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
