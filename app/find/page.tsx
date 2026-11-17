import { redirect } from 'next/navigation'
import { findRedirectTarget, type DirectorySearch } from '@/lib/directory-params'

// The Find screen (the map search) was removed: in-person care starts from Browse specialities. Old links, bookmarks
// and search engines still land somewhere useful (lib/directory-params.ts).
export default async function FindPage(props: { searchParams: Promise<DirectorySearch> }) {
  redirect(findRedirectTarget(await props.searchParams))
}
