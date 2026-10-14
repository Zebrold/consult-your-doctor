import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FileLock2 } from 'lucide-react'
import { requireExecutive } from '../../_lib/ops'
import { PolicyDocument } from '@/components/legal/PolicyDocument'
import { PUBLIC_BY_NUMBER, docHref } from '@/lib/legal-docs'
import { TEMPLATE_DOCS } from '@/lib/legal-docs/templates'

// A signing template (employment contract, offer letter, NDA), for the operations team only.

const template = (slug: string) => TEMPLATE_DOCS.find((d) => d.slug === slug) ?? null

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = template((await params).slug)
  return doc ? { title: `${doc.title} (${doc.number})`, robots: { index: false } } : {}
}

const link = (number: string) => {
  const published = PUBLIC_BY_NUMBER[number]
  if (published) return docHref(published)
  const internal = TEMPLATE_DOCS.find((d) => d.number === number)
  return internal ? `/executive/policies/${internal.slug}` : null
}

export default async function ExecutiveTemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireExecutive()
  const doc = template((await params).slug)
  if (!doc) notFound()

  return (
    <PolicyDocument
      embedded
      doc={doc}
      link={link}
      pdf={null}
      backHref="/executive/policies"
      backLabel="Policies & Templates"
      notice={
        <p className="mb-8 flex items-start gap-3 p-4 rounded-2xl bg-soft-coral/10 text-[14px] leading-relaxed text-indigo-gray-900">
          <FileLock2 className="w-5 h-5 text-soft-coral shrink-0 mt-0.5" />
          <span>
            <strong>Staff only.</strong> This template carries the authorised signatory&apos;s electronic signature. Don&apos;t publish it or send it out blank; fill it
            in for one named person or organisation, and keep the signed copy in the document control file (CYD-REG-00).
          </span>
        </p>
      }
    />
  )
}
