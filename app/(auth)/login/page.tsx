import { redirect } from 'next/navigation'

export default async function LoginRedirect(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(searchParams)) {
    if (typeof val === 'string') params.set(key, val)
    else if (Array.isArray(val)) val.forEach(v => params.append(key, v))
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  redirect(`/login/patient${query}`)
}

