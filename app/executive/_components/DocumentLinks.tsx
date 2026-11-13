import { FileText } from 'lucide-react'

// An application's uploaded documents (registration certificate, PAN card, ...), each opening in a new tab through a
// 10-minute signed link. Reloading the page makes fresh links.
export function DocumentLinks({ links }: { links: { key: string; label: string; url: string | null }[] | undefined }) {
  if (!links || links.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-label-sm text-[11px] uppercase tracking-wider text-indigo-gray-600 mr-1">Documents</span>
      {links.map((doc) =>
        doc.url ? (
          <a
            key={doc.key}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest font-label-sm text-label-sm text-on-surface hover:text-vibrant-blue"
          >
            <FileText className="w-3.5 h-3.5 text-vibrant-blue" /> {doc.label}
          </a>
        ) : (
          <span key={doc.key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest font-label-sm text-label-sm text-indigo-gray-600">
            <FileText className="w-3.5 h-3.5" /> {doc.label} (could not open; reload)
          </span>
        ),
      )}
    </div>
  )
}
