import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, ExternalLink, FileLock2, FileText, Library } from 'lucide-react'
import { requireExecutive } from '../_lib/ops'
import { Chip, PageHeader, Panel } from '../_components/ui'
import { AREA_LABELS, PUBLIC_DOCS, docHref, pdfHref } from '@/lib/legal-docs'
import { TEMPLATE_DOCS } from '@/lib/legal-docs/templates'

export const metadata: Metadata = { title: 'Policies & Templates' }

// The whole policy set for the operations team: the signing templates, which are not published, and links to the
// published policies at /legal.
export default async function ExecutivePoliciesPage() {
  await requireExecutive()

  return (
    <>
      <PageHeader
        eyebrow="Document control"
        title="Policies & Templates"
        description="The Consult Your Doctor policy set (CYD-REG-00), version 1.0, approved by the directors. Published policies are on the public Legal page; the signing templates below are for staff only."
        actions={
          <Link href="/legal" target="_blank" className="flex items-center gap-2 px-5 py-3 rounded-full bg-surface-container-lowest text-indigo-gray-900 hover:bg-surface-container shadow-sm font-label-sm text-label-sm transition-all">
            <ExternalLink className="w-4 h-4 text-vibrant-blue" /> Open the public Legal page
          </Link>
        }
      />

      <Panel
        title="Signing Templates"
        icon={FileLock2}
        description="These carry the authorised signatory's electronic signature, so they are not published or offered as a PDF. Fill one in only for a named person or organisation."
        aside={<Chip tone="coral">Staff only</Chip>}
      >
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEMPLATE_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link href={`/executive/policies/${doc.slug}`} className="h-full flex flex-col gap-1.5 p-4 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low ring-1 ring-transparent hover:ring-vibrant-blue/30 transition-all">
                <span className="font-mono text-[12px] font-semibold text-vibrant-blue">{doc.number}</span>
                <span className="font-semibold text-indigo-gray-900">{doc.title}</span>
                <span className="text-sm text-indigo-gray-600">{doc.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Published Policies" icon={Library} description="Shown to everyone at /legal, each with its signed PDF.">
        <div className="overflow-x-auto rounded-xl ring-1 ring-surface-container">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-surface-container-low text-indigo-gray-600 font-label-sm text-label-sm">
                <th className="py-3 px-4 font-semibold">No.</th>
                <th className="py-3 px-4 font-semibold">Document</th>
                <th className="py-3 px-4 font-semibold">Area</th>
                <th className="py-3 px-4 font-semibold text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {PUBLIC_DOCS.map((doc) => {
                const pdf = pdfHref(doc)
                return (
                  <tr key={doc.slug} className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4 font-mono text-[13px] text-indigo-gray-900">{doc.number}</td>
                    <td className="py-3 px-4 font-semibold text-indigo-gray-900">{doc.title}</td>
                    <td className="py-3 px-4 text-indigo-gray-600">{AREA_LABELS[doc.area].title}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Link href={docHref(doc)} target="_blank" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-container-low text-[12px] font-semibold text-vibrant-blue hover:bg-surface-container">
                          <FileText className="w-3.5 h-3.5" /> Read
                        </Link>
                        {pdf && (
                          <a href={pdf} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-container-low text-[12px] font-semibold text-indigo-gray-900 hover:bg-surface-container">
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
