import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, ExternalLink, FileText } from 'lucide-react'
import { requireExecutive } from '../_lib/ops'
import { Card, Chip, ExePage, Table, btnOutline, btnSmall, card, td, th } from '../_components/ui'
import { AREA_LABELS, PUBLIC_DOCS, docHref, pdfHref } from '@/lib/legal-docs'
import { TEMPLATE_DOCS } from '@/lib/legal-docs/templates'

export const metadata: Metadata = { title: 'Policies & templates' }

// The whole policy set for the operations team: the signing templates, which are not published, and links to the
// published policies at /legal.
export default async function ExecutivePoliciesPage() {
  const { profile } = await requireExecutive()

  return (
    <ExePage
      name={profile.fullName}
      title="Policies & templates"
      subtitle="The Consult Your Doctor policy set (CYD-REG-00), version 1.0, approved by the directors"
      actions={
        <Link href="/legal" target="_blank" className={btnOutline}>
          <ExternalLink className="w-4 h-4" /> Open the public Legal page
        </Link>
      }
    >
      <Card
        title="Signing templates"
        sub="These carry the authorised signatory’s electronic signature, so they are not published or offered as a PDF. Fill one in only for a named person or organisation."
        right={<Chip tone="coral">Staff only</Chip>}
      >
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEMPLATE_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link href={`/executive/policies/${doc.slug}`} className={`${card} h-full flex flex-col gap-1 p-4 hover:shadow-[0_0_0_1.5px_#2A4DD0] transition-shadow`}>
                <span className="font-mono text-[12px] font-bold text-[#2A4DD0]">{doc.number}</span>
                <span className="text-[14px] font-extrabold">{doc.title}</span>
                <span className="text-[12.5px] text-[#5B667A]">{doc.subtitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Published policies" sub="Shown to everyone at /legal, each with its signed PDF">
        <Table min={680}>
          <thead>
            <tr>
              <th className={th}>No.</th>
              <th className={th}>Document</th>
              <th className={th}>Area</th>
              <th className={`${th} text-right`}>Open</th>
            </tr>
          </thead>
          <tbody>
            {PUBLIC_DOCS.map((doc) => {
              const pdf = pdfHref(doc)
              return (
                <tr key={doc.slug}>
                  <td className={`${td} font-mono text-[12.5px]`}>{doc.number}</td>
                  <td className={`${td} font-extrabold`}>{doc.title}</td>
                  <td className={`${td} text-[#5B667A]`}>{AREA_LABELS[doc.area].title}</td>
                  <td className={td}>
                    <span className="flex justify-end gap-2">
                      <Link href={docHref(doc)} target="_blank" className={btnSmall}>
                        <FileText className="w-3.5 h-3.5" /> Read
                      </Link>
                      {pdf && (
                        <a href={pdf} target="_blank" rel="noopener" className={btnSmall}>
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </ExePage>
  )
}
