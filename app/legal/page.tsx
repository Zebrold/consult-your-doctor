import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight, Building2, Download, FileText, FlaskConical, KeyRound, LockKeyhole, Scale, ShieldCheck, Stethoscope, Users,
  type LucideIcon,
} from 'lucide-react'
import {
  AI_USE_POLICY,
  AREA_LABELS,
  AREA_ORDER,
  DOCUMENT_REGISTER,
  DOC_EFFECTIVE,
  LEGAL_COMPANY,
  PRIVACY_NOTICE,
  PUBLIC_DOCS,
  docHref,
  docsInArea,
  pdfHref,
  type DocArea,
  type PolicyDoc,
} from '@/lib/legal-docs'

export const metadata: Metadata = {
  title: 'Legal and Policies',
  description:
    'The signed policies behind Consult Your Doctor: privacy notice and consent, AI use, telemedicine, prescriptions, diagnostic centre checks, data retention, security and more, to read online or download as PDF.',
  alternates: { canonical: '/legal' },
}

const AREA_ICONS: Record<DocArea, LucideIcon> = { clinical: Stethoscope, data: LockKeyhole, security: KeyRound, internal: Users }

// The website terms predate the policy set and live on their own pages.
const START_HERE = [
  { href: '/terms-of-use', label: 'Website terms', title: 'Terms & Conditions', text: 'The terms for using Consult Your Doctor as a patient, doctor, hospital or diagnostic centre.', pdf: null },
  { href: '/privacy-policy', label: 'Website terms', title: 'Privacy Policy', text: 'How the website and app collect, use, share and protect your information.', pdf: null },
  { href: docHref(PRIVACY_NOTICE), label: PRIVACY_NOTICE.number, title: PRIVACY_NOTICE.title, text: PRIVACY_NOTICE.subtitle, pdf: pdfHref(PRIVACY_NOTICE) },
  { href: docHref(AI_USE_POLICY), label: AI_USE_POLICY.number, title: AI_USE_POLICY.title, text: AI_USE_POLICY.subtitle, pdf: pdfHref(AI_USE_POLICY) },
]

function DocCard({ doc }: { doc: PolicyDoc }) {
  const pdf = pdfHref(doc)
  return (
    <li className="group relative flex flex-col rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40 p-5 hover:ring-vibrant-blue/50 hover:shadow-[0_10px_30px_-18px_rgba(0,80,220,0.45)] transition-all">
      <span className="self-start px-2.5 py-0.5 rounded-full bg-primary-fixed/70 text-primary text-[11px] font-bold tracking-wider">{doc.number}</span>
      <h3 className="mt-3 font-title-md text-[16.5px] font-bold leading-snug text-on-surface group-hover:text-vibrant-blue transition-colors">
        <Link href={docHref(doc)} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {doc.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-on-surface-variant line-clamp-3">{doc.subtitle}</p>
      <div className="mt-auto pt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-vibrant-blue">
          Read <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
        {pdf && (
          <a
            href={pdf}
            target="_blank"
            rel="noopener"
            aria-label={`Download the signed PDF of ${doc.title}`}
            className="relative z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-container-low text-[12px] font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </a>
        )}
      </div>
    </li>
  )
}

export default function LegalHubPage() {
  return (
    <div className="w-full bg-background min-h-screen">
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white">
        <span aria-hidden className="absolute -right-28 -top-24 w-[28rem] h-[28rem] rounded-full bg-white/[0.07]" />
        <span aria-hidden className="absolute right-32 -bottom-40 w-80 h-80 rounded-full bg-white/[0.05]" />
        <div className="relative max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop pt-10 md:pt-14 pb-10 md:pb-14">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[12px] font-bold tracking-wider uppercase">
            <Scale className="w-3.5 h-3.5" /> Legal and policies
          </p>
          <h1 className="mt-4 font-title-md text-[32px] md:text-[46px] font-extrabold leading-[1.08] tracking-tight max-w-3xl">The rules we work by, in writing</h1>
          <p className="mt-3 text-[15.5px] md:text-[17px] text-white/85 max-w-2xl leading-relaxed">
            How consultations, prescriptions, diagnostic reports, Zebrold AI and your personal data are handled on Consult Your Doctor. Each document is version 1.0,
            approved and electronically signed by the directors of {LEGAL_COMPANY.name}, and takes effect on {DOC_EFFECTIVE}.
          </p>
          <dl className="mt-7 grid grid-cols-3 gap-2.5 max-w-xl">
            {[
              { value: PUBLIC_DOCS.length, label: 'Published documents' },
              { value: AREA_ORDER.length, label: 'Areas covered' },
              { value: '2', label: 'Countries: India and Germany' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/15 border border-white/20 px-3 py-3 min-w-0">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block font-title-md text-[24px] md:text-[28px] font-extrabold leading-none tabular-nums">{s.value}</span>
                  <span className="block mt-1.5 text-[11.5px] md:text-[12.5px] font-medium text-white/85 leading-tight">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="max-w-container-max mx-auto px-margin-x-mobile md:px-margin-x-desktop py-10 md:py-14 flex flex-col gap-12 md:gap-16">
        {/* Start here */}
        <section aria-labelledby="start-here" className="flex flex-col gap-5">
          <div>
            <h2 id="start-here" className="font-title-md text-[22px] md:text-[26px] font-extrabold tracking-tight text-on-surface">Start here</h2>
            <p className="mt-1 text-[14.5px] text-on-surface-variant">The documents most patients look for first.</p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {START_HERE.map((item) => (
              <li key={item.href} className="group relative flex flex-col rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40 p-5 hover:ring-vibrant-blue/50 transition-all">
                <span className="w-11 h-11 rounded-xl bg-vibrant-blue/10 text-vibrant-blue flex items-center justify-center">
                  {item.pdf ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </span>
                <span className="mt-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{item.label}</span>
                <h3 className="mt-0.5 font-title-md text-[16.5px] font-bold leading-snug text-on-surface group-hover:text-vibrant-blue transition-colors">
                  <Link href={item.href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-on-surface-variant">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* The policy set, by area */}
        {AREA_ORDER.map((area) => {
          const Icon = AREA_ICONS[area]
          const docs = docsInArea(area)
          return (
            <section key={area} aria-labelledby={`area-${area}`} className="flex flex-col gap-5">
              <div className="flex items-start gap-3.5">
                <span className="w-11 h-11 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/40 text-vibrant-blue flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h2 id={`area-${area}`} className="font-title-md text-[22px] md:text-[26px] font-extrabold tracking-tight text-on-surface">
                    {AREA_LABELS[area].title}
                    <span className="ml-2 align-middle text-[13px] font-semibold text-on-surface-variant">{docs.length}</span>
                  </h2>
                  <p className="mt-1 text-[14.5px] text-on-surface-variant max-w-2xl">{AREA_LABELS[area].description}</p>
                </div>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <DocCard key={doc.slug} doc={doc} />
                ))}
              </ul>
            </section>
          )
        })}

        {/* About the set, and who issues it */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40 p-6 flex flex-col gap-3">
            <h2 className="font-title-md text-[18px] font-bold text-on-surface">About this document set</h2>
            <p className="text-[14px] leading-relaxed text-on-surface-variant">
              The {DOCUMENT_REGISTER.title} ({DOCUMENT_REGISTER.number}) lists every document in the set, who owns it and how it is reviewed. Each document is reviewed at
              least once a year, and changes are issued as a new version approved by the directors. Staff employment and agreement templates in the register are used
              internally and are not published here.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={docHref(DOCUMENT_REGISTER)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-vibrant-blue text-white text-sm font-bold hover:bg-primary transition-colors">
                Open the register <ArrowRight className="w-4 h-4" />
              </Link>
              {pdfHref(DOCUMENT_REGISTER) && (
                <a href={pdfHref(DOCUMENT_REGISTER)!} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface-container-low text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                  <Download className="w-4 h-4" /> PDF
                </a>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-6 flex flex-col gap-1.5 text-[14px] leading-relaxed text-on-surface-variant">
            <h2 className="font-title-md text-[18px] font-bold text-on-surface mb-1.5">Issued by</h2>
            <p className="font-semibold text-on-surface">{LEGAL_COMPANY.name}, operator of Consult Your Doctor</p>
            <p>CIN: {LEGAL_COMPANY.cin}</p>
            <p>Operational office: {LEGAL_COMPANY.operationalOffice}</p>
            <p>Registered office: {LEGAL_COMPANY.registeredOffice}</p>
            <p className="pt-1">
              Questions about these documents? <Link href="/contact" className="font-semibold text-vibrant-blue hover:underline">Contact us</Link>.
            </p>
          </div>
        </section>

        {/* Partners */}
        <section className="rounded-3xl bg-[linear-gradient(160deg,#0758f2_0%,#1570ff_55%,#2b86ff_100%)] text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <h2 className="font-title-md text-[20px] md:text-[24px] font-extrabold tracking-tight">Run a hospital or a diagnostic centre?</h2>
            <p className="mt-1.5 text-[14.5px] text-white/85 leading-relaxed">
              Partners follow the standards above. Apply to join, and our operations team checks your registration and accreditation before you go live.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/signup/hospital" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-vibrant-blue text-sm font-bold hover:bg-white/90 transition-colors">
              <Building2 className="w-4 h-4" /> Join as a hospital
            </Link>
            <Link href="/signup/diagnostic-centre" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-bold hover:bg-white/25 transition-colors">
              <FlaskConical className="w-4 h-4" /> Join as a diagnostic centre
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
