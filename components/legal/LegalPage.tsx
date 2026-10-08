'use client'

import Link from 'next/link'
import { useState, useMemo, type ReactNode } from 'react'
import {
  FileText, Info, ShieldCheck, ArrowLeft, Printer, Search, CheckCircle2,
  Stethoscope, Building2, Microscope, User, ShieldAlert,
} from 'lucide-react'
import { LEGAL_UPDATED, type LegalDocument } from '@/lib/legal'
import { COMPANY } from '@/lib/company'

export type LegalUserContext = {
  email?: string | null
  name?: string | null
  role?: string | null
}

const DOCS = [
  { href: '/terms-of-use', label: 'Terms & Conditions', icon: FileText },
  { href: '/privacy-policy', label: 'Privacy Policy', icon: ShieldCheck },
]

/** "**bold** text" → text with the bold runs in <strong>. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-on-surface">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

function roleMeta(role?: string | null) {
  switch (role) {
    case 'doctor':
      return { label: 'Doctor', href: '/doctor/dashboard', portal: 'Doctor Dashboard', icon: Stethoscope }
    case 'hospital_admin':
      return { label: 'Hospital Admin', href: '/hospital/dashboard', portal: 'Hospital Portal', icon: Building2 }
    case 'diagnostic_admin':
      return { label: 'Diagnostic Staff', href: '/diagnostic-center/dashboard', portal: 'Diagnostic Portal', icon: Microscope }
    case 'executive':
      return { label: 'Executive', href: '/executive/dashboard', portal: 'Executive Dashboard', icon: ShieldAlert }
    case 'super_admin':
      return { label: 'Administrator', href: '/admin/dashboard', portal: 'Admin Console', icon: ShieldAlert }
    default:
      return { label: 'Patient', href: '/patient/profile', portal: 'Patient Portal', icon: User }
  }
}

/**
 * A legal document (Terms & Conditions or Privacy Policy) for visitors and signed-in users alike:
 * Contextual post-signin banner, search/filter, table of contents, summary, print action, and full text.
 */
export function LegalPage({
  doc,
  current,
  user,
}: {
  doc: LegalDocument
  current: string
  user?: LegalUserContext | null
}) {
  const [search, setSearch] = useState('')
  const roleInfo = user ? roleMeta(user.role) : null
  const RoleIcon = roleInfo?.icon

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!search.trim()) return doc.sections
    const q = search.toLowerCase()
    return doc.sections.filter((s) => {
      if (s.title.toLowerCase().includes(q)) return true
      return s.body.some((b) =>
        Array.isArray(b) ? b.some((item) => item.toLowerCase().includes(q)) : b.toLowerCase().includes(q),
      )
    })
  }, [doc.sections, search])

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Signed-in User Return Bar */}
      {user && roleInfo && (
        <aside aria-label="Portal Navigation" className="sticky top-20 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/40 shadow-xs print:hidden">
          <div className="max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs md:text-sm text-on-surface-variant">
              {RoleIcon && <RoleIcon className="w-4 h-4 text-vibrant-blue shrink-0" />}
              <span>
                Signed in as <strong className="text-on-surface font-semibold">{user.name || user.email || 'User'}</strong>
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-[11px]">
                {roleInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={roleInfo.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vibrant-blue text-white font-semibold text-xs md:text-sm shadow-xs hover:bg-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to {roleInfo.portal}
              </Link>
            </div>
          </div>
        </aside>
      )}

      {/* Header Section */}
      <section className="max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop pt-8 md:pt-12 pb-6 print:pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-surface-container-high text-primary rounded-full font-label-sm text-label-sm tracking-wider uppercase font-semibold">
              Legal &amp; Compliance
            </span>
            <h1 className="mt-3 font-display-lg text-[32px] md:text-display-lg text-on-surface font-bold leading-tight">
              {doc.title}
            </h1>
            <p className="mt-1.5 text-on-surface-variant text-[14px] md:text-[15px]">
              Last updated: <span className="font-semibold text-on-surface">{LEGAL_UPDATED}</span> • Valid for all platform users &amp; partners
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-outline-variant/60 text-on-surface hover:bg-surface-container-low text-xs md:text-sm font-semibold transition-colors"
              title="Print document or save as PDF"
            >
              <Printer className="w-4 h-4 text-on-surface-variant" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Document Switcher & Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
            {DOCS.map(({ href, label, icon: Icon }) => {
              const active = href === current
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold transition-all ${
                    active
                      ? 'bg-vibrant-blue text-white shadow-xs'
                      : 'bg-surface-container-lowest border border-outline-variant/60 text-on-surface hover:border-vibrant-blue/50 hover:bg-surface-container-low'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              )
            })}
          </nav>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in document..."
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/50 text-xs md:text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-vibrant-blue"
            />
          </div>
        </div>
      </section>

      {/* Main Content & Table of Contents */}
      <div className="max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop pb-16 md:pb-24 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        {/* Sticky Sidebar on Desktop */}
        <aside className="hidden lg:block sticky top-36 print:hidden">
          <p className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Table of Contents</p>
          <ol className="flex flex-col gap-1 border-l border-outline-variant/50 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block pl-3 -ml-px border-l-2 border-transparent hover:border-vibrant-blue py-1 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors truncate"
                  title={s.title}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Content Body */}
        <article className="min-w-0 max-w-3xl">
          {/* Executive Summary / Highlights Callout */}
          <div className="rounded-2xl bg-primary-fixed/30 border border-vibrant-blue/25 p-5 md:p-6 mb-10 shadow-xs">
            <p className="flex items-center gap-2 font-title-md text-[16px] font-bold text-on-surface mb-3">
              <Info className="w-5 h-5 text-vibrant-blue shrink-0" /> Key Highlights &amp; Summary
            </p>
            <ul className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed text-on-surface-variant">
              {doc.summary.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-vibrant-blue shrink-0 mt-1" />
                  <span>{rich(s)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-[12.5px] text-on-surface-variant/80 border-t border-outline-variant/30 pt-2.5">
              This summary is provided for convenience. The legally binding provisions are detailed below in full.
            </p>
          </div>

          {/* Search Result Feedback */}
          {search && (
            <div className="mb-6 px-4 py-2 rounded-xl bg-surface-container-low text-xs text-on-surface-variant flex items-center justify-between">
              <span>Showing {filteredSections.length} section(s) matching &ldquo;{search}&rdquo;</span>
              <button onClick={() => setSearch('')} className="text-vibrant-blue font-semibold hover:underline">
                Clear search
              </button>
            </div>
          )}

          {/* Document Sections */}
          {filteredSections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-36 mb-10 pb-6 border-b border-outline-variant/30 last:border-b-0">
              <h2 className="font-title-md text-[19px] md:text-[22px] font-bold text-on-surface mb-3.5 flex items-center gap-2">
                {s.title}
              </h2>
              <div className="flex flex-col gap-3.5 text-[15px] leading-relaxed text-on-surface-variant">
                {s.body.map((block, i) =>
                  Array.isArray(block) ? (
                    <ul key={i} className="list-disc pl-5 flex flex-col gap-2.5 my-1">
                      {block.map((item, j) => (
                        <li key={j} className="leading-relaxed">
                          {rich(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="leading-relaxed">
                      {rich(block)}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}

          {/* Footer Info Box */}
          <div className="mt-12 pt-6 border-t border-outline-variant/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[14px] text-on-surface-variant">
            <span>
              Questions regarding these terms? Contact us at{' '}
              <a href={`mailto:${COMPANY.email}`} className="text-vibrant-blue font-semibold hover:underline">
                {COMPANY.email}
              </a>
            </span>
            <span className="flex gap-4">
              {DOCS.filter((d) => d.href !== current).map((d) => (
                <Link key={d.href} href={d.href} className="font-semibold text-vibrant-blue hover:underline">
                  View {d.label} →
                </Link>
              ))}
            </span>
          </div>
        </article>
      </div>
    </div>
  )
}
