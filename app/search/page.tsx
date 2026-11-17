import { redirect } from 'next/navigation'
import { findRedirectTarget, type DirectorySearch } from '@/lib/directory-params'

// The older search address. A hospital's doctors are listed, with their open times, on the hospital's own page; any
// other search goes where /find now sends it (lib/directory-params.ts).
export default async function SearchPage(props: { searchParams: Promise<DirectorySearch> }) {
  const params = await props.searchParams
  const hospitalId = typeof params.hospital_id === 'string' ? params.hospital_id : ''
  if (/^[0-9a-f-]{36}$/i.test(hospitalId)) redirect(`/hospitals/${hospitalId}`)
  redirect(findRedirectTarget(params))
}
