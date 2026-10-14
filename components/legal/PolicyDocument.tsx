import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Download, FileText, Hash, ShieldCheck } from 'lucide-react'
import {
  DIRECTORS,
  DOC_EFFECTIVE,
  DOC_VERSION,
  LEGAL_COMPANY,
  sectionId,
  type Block,
  type PolicyDoc,
} from '@/lib/legal-docs/types'
import { PrintButton } from './PrintButton'

// One document of the policy set (lib/legal-docs), laid out like the signed PDF: number, version and effective date,
// the sections with a contents list, and the directors' approval. Shared by /legal/<document> and, for the signing
// templates, the executive portal.

type Linker = (number: string) => string | null

const TOKEN = /(\*\*[^*]+\*\*)|(_{3,})|(CYD-[A-Z]+-\d{2})/g

/** Inline text: **bold**, ___ blanks to fill in, and document numbers linked to their documents. */
function Inline({ text, link, self }: { text: string; link: Linker; self: string }): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    if (m[1]) {
      out.push(
        <strong key={i} className="font-semibold text-on-surface">
          <Inline text={m[1].slice(2, -2)} link={link} self={self} />
        </strong>,
      )
    } else if (m[2]) {
      out.push(
        <span key={i} className="inline-block w-28 max-w-full h-[1.1em] align-baseline border-b border-dashed border-on-surface-variant/60 mx-0.5">
          <span className="sr-only">(blank)</span>
        </span>,
      )
    } else {
      const href = m[3] !== self ? link(m[3]) : null
      out.push(
        href ? (
          <Link key={i} href={href} className="font-semibold text-vibrant-blue hover:underline underline-offset-2 whitespace-nowrap">
            {m[3]}
          </Link>
        ) : (
          <span key={i} className="whitespace-nowrap">{m[3]}</span>
        ),
      )
    }
    last = i + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

function SignatureCard({ name, role, signed = true }: { name?: string; role: string; signed?: boolean }) {
  return (
    <div className="flex-1 min-w-[220px] rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4">
      {signed && name ? (
        <>
          <p className="font-serif italic text-[22px] leading-tight text-[#1d3fa0]">{name}</p>
          <p className="mt-1 text-[11px] text-on-surface-variant">Electronically signed | {DOC_EFFECTIVE}</p>
          <p className="mt-2 text-sm font-bold text-on-surface">{name}</p>
          <p className="text-[13px] text-on-surface-variant">{role}</p>
          <p className="text-[13px] text-on-surface-variant">Date: {DOC_EFFECTIVE}</p>
        </>
      ) : (
        <>
          <div className="h-[30px] border-b border-on-surface-variant/50" aria-hidden />
          <p className="mt-2 text-sm font-bold text-on-surface">Name: <span className="inline-block w-36 border-b border-dashed border-on-surface-variant/60 align-baseline" /></p>
          <p className="text-[13px] text-on-surface-variant">{role}</p>
          <p className="text-[13px] text-on-surface-variant">
            Date: <span className="inline-block w-20 border-b border-dashed border-on-surface-variant/60 align-baseline" /> Place:{' '}
            <span className="inline-block w-20 border-b border-dashed border-on-surface-variant/60 align-baseline" />
          </p>
        </>
      )}
    </div>
  )
}

function BlockView({ block, link, self }: { block: Block; link: Linker; self: string }) {
  switch (block.kind) {
    case 'p':
      return (
        <p className="leading-relaxed">
          <Inline text={block.text} link={link} self={self} />
        </p>
      )
    case 'ul':
      return (
        <ul className="list-disc pl-5 flex flex-col gap-2 marker:text-vibrant-blue">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed pl-1">
              <Inline text={item} link={link} self={self} />
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="list-decimal pl-6 flex flex-col gap-2 marker:font-semibold marker:text-vibrant-blue">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed pl-1">
              <Inline text={item} link={link} self={self} />
            </li>
          ))}
        </ol>
      )
    case 'table':
      return (
        <div className="-mx-1 overflow-x-auto overscroll-x-contain rounded-xl ring-1 ring-[#bcd3f5] print:overflow-visible">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-[#e3eefc] text-on-surface">
                {block.head.map((h) => (
                  <th key={h} scope="col" className="px-3.5 py-2.5 font-bold align-bottom border-b border-[#bcd3f5]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-[#dbe7f8] last:border-b-0 bg-surface-container-lowest">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`px-3.5 py-2.5 align-top leading-snug ${cell ? '' : 'h-10'} ${cell === '☐' ? 'text-center text-lg' : ''} ${c === 0 && block.head.length > 1 ? 'font-medium text-on-surface' : ''}`}
                    >
                      {cell ? <Inline text={cell} link={link} self={self} /> : <span className="sr-only">(blank)</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'sign':
      return (
        <div className="flex flex-wrap gap-3 pt-2">
          {block.roles.map((role) => (
            <SignatureCard key={role} role={role} signed={false} />
          ))}
        </div>
      )
    case 'signatory':
      return (
        <div className="flex flex-wrap gap-3 pt-2">
          <SignatureCard name={DIRECTORS[0]} role={`Authorised signatory, ${LEGAL_COMPANY.name}`} />
          <SignatureCard role={block.counterparty} signed={false} />
        </div>
      )
  }
}

export type DocNeighbour = { title: string; href: string; number: string }

export function PolicyDocument({
  doc,
  link,
  pdf,
  backHref,
  backLabel,
  previous,
  next,
  notice,
  embedded = false,
}: {
  doc: PolicyDoc
  /** Where a referenced document number leads, or null to leave it as text. */
  link: Linker
  pdf: string | null
  backHref: string
  backLabel: string
  previous?: DocNeighbour | null
  next?: DocNeighbour | null
  /** A note above the document, e.g. that a template is for staff only. */
  notice?: ReactNode
  /** Inside a portal page (the executive portal), which already provides the width and side padding. */
  embedded?: boolean
}) {
  const container = embedded ? 'px-5 md:px-8' : 'max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop'
  const sections = doc.sections.map((s) => ({ ...s, id: sectionId(s.title) }))
  const meta = [
    { icon: Hash, label: 'Document', value: doc.number },
    { icon: FileText, label: 'Version', value: DOC_VERSION },
    { icon: CalendarDays, label: 'Effective', value: DOC_EFFECTIVE },
    { icon: BadgeCheck, label: 'Status', value: 'Approved' },
  ]

  return (
    <div className={embedded ? 'w-full' : 'w-full bg-background min-h-screen'}>
      {/* Title */}
      <section className={`relative overflow-hidden bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white print:bg-none print:text-black ${embedded ? 'rounded-3xl' : ''}`}>
        <span aria-hidden className="absolute -right-28 -top-24 w-96 h-96 rounded-full bg-white/[0.07] print:hidden" />
        <span aria-hidden className="absolute right-24 -bottom-32 w-72 h-72 rounded-full bg-white/[0.05] print:hidden" />
        <div className={`relative ${container} pt-8 md:pt-12 pb-8 md:pb-10`}>
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/85 hover:text-white print:hidden">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </Link>
          <p className="mt-5 flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[12px] font-bold tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5" /> {doc.number}
          </p>
          <h1 className="mt-3 font-title-md text-[28px] md:text-[40px] font-extrabold leading-[1.12] tracking-tight max-w-4xl">{doc.title}</h1>
          <p className="mt-2 text-[15px] md:text-[17px] text-white/85 max-w-3xl leading-snug">{doc.subtitle}</p>

          <div className="mt-6 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl w-full">
              {meta.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-white/12 border border-white/20 px-3.5 py-2.5 min-w-0 print:border-black/20">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/75 print:text-black/60">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </dt>
                  <dd className="mt-0.5 text-[14px] font-bold truncate">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {pdf && (
                <a
                  href={pdf}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-vibrant-blue text-sm font-bold shadow-sm hover:bg-white/90 transition-colors"
                >
                  <Download className="w-4 h-4" /> Signed PDF
                </a>
              )}
              <PrintButton />
            </div>
          </div>
        </div>
      </section>

      <div className={`${embedded ? '' : container} py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-8 lg:gap-12 items-start`}>
        {/* Contents */}
        <aside className="hidden lg:block sticky top-[calc(var(--header-h,72px)+24px)] print:hidden">
          <p className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">Contents</p>
          <ol className="flex flex-col gap-0.5 border-l border-outline-variant/50 max-h-[calc(100dvh-12rem)] overflow-y-auto pr-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block pl-3 -ml-px border-l-2 border-transparent hover:border-vibrant-blue py-1 text-[13px] leading-snug text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
            {doc.approval === 'directors' && (
              <li>
                <a href="#approval" className="block pl-3 -ml-px border-l-2 border-transparent hover:border-vibrant-blue py-1 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">
                  Approval
                </a>
              </li>
            )}
          </ol>
        </aside>

        <article className="min-w-0 max-w-3xl">
          {notice}

          {/* Phones and tablets: contents as a collapsible list */}
          <details className="lg:hidden mb-8 rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40 print:hidden">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-4 py-3.5 flex items-center justify-between text-sm font-bold text-on-surface">
              Contents <span className="text-[12px] font-semibold text-vibrant-blue">{sections.length} sections</span>
            </summary>
            <ol className="px-4 pb-4 grid gap-1 text-[14px]">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block py-1.5 text-on-surface-variant hover:text-vibrant-blue">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <div className="flex flex-col gap-9 text-[15px] text-on-surface-variant">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28 flex flex-col gap-3.5">
                <h2 className="font-title-md text-[19px] md:text-[21px] font-bold text-on-surface tracking-tight">{s.title}</h2>
                {s.blocks.map((block, i) => (
                  <BlockView key={i} block={block} link={link} self={doc.number} />
                ))}
              </section>
            ))}

            {doc.approval === 'directors' && (
              <section id="approval" className="scroll-mt-28 flex flex-col gap-3.5 pt-6 border-t border-outline-variant/40">
                <h2 className="font-title-md text-[19px] md:text-[21px] font-bold text-on-surface tracking-tight">Approval</h2>
                <p className="leading-relaxed">This document is approved by the directors of {LEGAL_COMPANY.name}, the operator of Consult Your Doctor.</p>
                <div className="flex flex-wrap gap-3">
                  {DIRECTORS.map((name) => (
                    <SignatureCard key={name} name={name} role={`Director, ${LEGAL_COMPANY.name}`} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Issuer */}
          <div className="mt-12 rounded-2xl bg-surface-container-low p-5 text-[13px] leading-relaxed text-on-surface-variant">
            <p className="font-bold text-on-surface">{LEGAL_COMPANY.name}</p>
            <p>CIN: {LEGAL_COMPANY.cin}</p>
            <p>Operational office: {LEGAL_COMPANY.operationalOffice}</p>
            <p>Registered office: {LEGAL_COMPANY.registeredOffice}</p>
            <p className="mt-2">
              Document No.: {doc.number} | Version {DOC_VERSION} | Effective date: {DOC_EFFECTIVE} | Owner: {LEGAL_COMPANY.name} | Status: Approved
            </p>
          </div>

          {(previous || next) && (
            <nav aria-label="More documents" className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
              {previous ? (
                <Link href={previous.href} className="group rounded-2xl ring-1 ring-outline-variant/40 bg-surface-container-lowest p-4 hover:ring-vibrant-blue/50 transition-shadow">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant">
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous · {previous.number}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-on-surface group-hover:text-vibrant-blue">{previous.title}</span>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next && (
                <Link href={next.href} className="group rounded-2xl ring-1 ring-outline-variant/40 bg-surface-container-lowest p-4 sm:text-right hover:ring-vibrant-blue/50 transition-shadow">
                  <span className="flex sm:justify-end items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant">
                    Next · {next.number} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="mt-1 block text-sm font-bold text-on-surface group-hover:text-vibrant-blue">{next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </article>
      </div>
    </div>
  )
}
