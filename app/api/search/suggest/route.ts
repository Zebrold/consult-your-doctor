import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SPECIALITIES } from '@/components/home/specialities'
import { pricedTests } from '@/lib/pricing'
import { pausedDoctorIds } from '@/lib/doctor-pause'
import { serverFetch } from '@/lib/supabase/fetch'

// Suggestions under the search boxes (components/patient/SearchSuggest.tsx): specialities, doctors, hospitals,
// diagnostic centres and tests matching what is typed. Only what the Find page shows the public: names, specialities and
// cities, read with the public key (no session), and doctors whose bookings are paused are left out. The list is built
// once and kept for five minutes, so each keystroke is a lookup in memory.

export type Suggestion = { kind: 'speciality' | 'doctor' | 'hospital' | 'lab' | 'test'; title: string; sub: string; href: string }

type Entry = Suggestion & { words: string }
type One<T> = T | T[] | null
const one = <T,>(v: One<T> | undefined) => (Array.isArray(v) ? v[0] ?? null : v ?? null)

const TTL = 5 * 60_000
let index: { at: number; entries: Entry[] } | null = null
let building: Promise<Entry[]> | null = null

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^dr\.?\s+/, '')

async function build(): Promise<Entry[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: serverFetch } },
  )
  const [doctors, hospitals, labs, paused] = await Promise.all([
    supabase.from('doctors').select('id, specialty, profiles!doctors_profile_id_fkey ( full_name ), hospitals ( name, city )').limit(2000),
    supabase.from('hospitals').select('id, name, city').eq('status', 'active').limit(1000),
    supabase.from('diagnostic_centers').select('id, name, city, test_prices').eq('status', 'active').limit(1000),
    pausedDoctorIds().catch(() => new Set<string>()),
  ])

  const entries: Entry[] = SPECIALITIES.map((s) => ({
    kind: 'speciality',
    title: s.name,
    sub: s.tagline,
    href: `/specialities/${s.slug}`,
    words: norm(`${s.name} ${s.tagline}`),
  }))

  type DoctorRow = { id: string; specialty: string | null; profiles: One<{ full_name: string | null }>; hospitals: One<{ name: string | null; city: string | null }> }
  for (const d of (doctors.data ?? []) as unknown as DoctorRow[]) {
    const name = one(d.profiles)?.full_name?.trim()
    if (!name || paused.has(d.id)) continue
    const hospital = one(d.hospitals)
    const title = /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`
    entries.push({
      kind: 'doctor',
      title,
      sub: [d.specialty, [hospital?.name, hospital?.city].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
      href: `/doctors/${d.id}`,
      words: norm(`${name} ${d.specialty ?? ''}`),
    })
  }

  for (const h of (hospitals.data ?? []) as { id: string; name: string | null; city: string | null }[]) {
    if (!h.name) continue
    entries.push({ kind: 'hospital', title: h.name, sub: h.city ? `Hospital · ${h.city}` : 'Hospital', href: `/hospitals/${h.id}`, words: norm(`${h.name} ${h.city ?? ''}`) })
  }

  const tests = new Map<string, { name: string; labs: number }>()
  for (const l of (labs.data ?? []) as { id: string; name: string | null; city: string | null; test_prices: Record<string, number | string> | null }[]) {
    if (!l.name) continue
    entries.push({ kind: 'lab', title: l.name, sub: l.city ? `Diagnostic centre · ${l.city}` : 'Diagnostic centre', href: `/book/diagnostic/${l.id}`, words: norm(`${l.name} ${l.city ?? ''}`) })
    for (const t of pricedTests(l.test_prices)) {
      const key = norm(t.name)
      const seen = tests.get(key)
      tests.set(key, { name: seen?.name ?? t.name, labs: (seen?.labs ?? 0) + 1 })
    }
  }
  for (const [key, t] of tests) {
    entries.push({ kind: 'test', title: t.name, sub: `Lab test · at ${t.labs} ${t.labs === 1 ? 'lab' : 'labs'}`, href: `/diagnostics?q=${encodeURIComponent(t.name)}`, words: key })
  }
  return entries
}

async function entries(): Promise<Entry[]> {
  if (index && Date.now() - index.at < TTL) return index.entries
  building ??= build()
    .then((list) => {
      index = { at: Date.now(), entries: list }
      return list
    })
    .finally(() => {
      building = null
    })
  return building
}

/**
 * 4: the name starts with it; 3: a word of the name does; 2: another word (speciality, city, tagline) does; 1: it is
 * inside a word, counted only from 4 letters ("care" inside "healthcare" isn't a match for "car"); 0: no match.
 */
function score(e: Entry, q: string) {
  const title = norm(e.title)
  if (title.startsWith(q)) return 4
  if (` ${title}`.includes(` ${q}`)) return 3
  if (` ${e.words}`.includes(` ${q}`)) return 2
  return q.length >= 4 && e.words.includes(q) ? 1 : 0
}

const LIMIT: Record<Suggestion['kind'], number> = { speciality: 3, doctor: 4, hospital: 3, lab: 2, test: 3 }

export async function GET(request: Request) {
  const q = norm(new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 60)
  if (q.length < 2) return NextResponse.json({ items: [] })
  let list: Entry[]
  try {
    list = await entries()
  } catch (err) {
    console.error('search suggest:', err)
    return NextResponse.json({ items: [] })
  }

  const ranked = list
    .map((e) => ({ e, s: score(e, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.length - b.e.title.length)
  // Within each kind, drop weak matches when there are strong ones ("Oncology" for "car" when "Cardiology" matches).
  const best: Record<string, number> = {}
  for (const r of ranked) best[r.e.kind] ??= r.s
  const taken: Record<string, number> = {}
  const items: Suggestion[] = []
  for (const { e, s } of ranked) {
    if (best[e.kind] >= 3 ? s < best[e.kind] : s < best[e.kind] - 1) continue
    if ((taken[e.kind] ?? 0) >= LIMIT[e.kind]) continue
    taken[e.kind] = (taken[e.kind] ?? 0) + 1
    items.push({ kind: e.kind, title: e.title, sub: e.sub, href: e.href })
    if (items.length >= 10) break
  }
  // Shown in groups, best match first within each.
  const order = Object.keys(LIMIT)
  items.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } })
}
