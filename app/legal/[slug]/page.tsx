import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PolicyDocument } from '@/components/legal/PolicyDocument'
import { PUBLIC_BY_NUMBER, PUBLIC_DOCS, docHref, pdfHref, publicDoc } from '@/lib/legal-docs'

// One published policy document, e.g. /legal/data-retention-and-deletion-policy. The signed PDF is at
// /legal/files/<file>. Open to every visitor and every signed-in portal (proxy.ts).

export const dynamicParams = false

export function generateStaticParams() {
  return PUBLIC_DOCS.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = publicDoc((await params).slug)
  if (!doc) return {}
  return {
    title: `${doc.title} (${doc.number})`,
    description: doc.subtitle,
    alternates: { canonical: docHref(doc) },
  }
}

const link = (number: string) => {
  const target = PUBLIC_BY_NUMBER[number]
  return target ? docHref(target) : null
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = publicDoc((await params).slug)
  if (!doc) notFound()

  const index = PUBLIC_DOCS.indexOf(doc)
  const neighbour = (i: number) => {
    const d = PUBLIC_DOCS[i]
    return d ? { title: d.title, number: d.number, href: docHref(d) } : null
  }

  return (
    <PolicyDocument
      doc={doc}
      link={link}
      pdf={pdfHref(doc)}
      backHref="/legal"
      backLabel="All legal documents"
      previous={neighbour(index - 1)}
      next={neighbour(index + 1)}
    />
  )
}
