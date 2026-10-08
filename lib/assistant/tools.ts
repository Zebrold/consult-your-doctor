import { z } from 'zod'
import type { createAdminClient } from '@/lib/supabase/admin'
import { one } from '@/components/patient/data'
import { CONSULTATION_PLATFORM_FEE, DIAGNOSTIC_PLATFORM_FEE } from '@/lib/pricing'
import { PdfDocSchema, preparePdfArgs, type PdfDoc } from './pdf-doc'

type Admin = ReturnType<typeof createAdminClient>
type Joined<T> = T | T[] | null

/** A tool the model can call. `input` validates the model's arguments before `run` sees them. */
export type AssistantTool = {
  name: string
  description: string
  /** Shown in the chat while the tool runs. */
  status: string
  input: z.ZodType
  /** Optional clean-up of the model's raw arguments before `input` validates them. */
  prepare?: (args: unknown) => unknown
  /** JSON Schema for the model, generated from `input`. */
  parameters: Record<string, unknown>
  run: (input: never) => Promise<string>
}

function tool<S extends z.ZodType>(def: { name: string; description: string; status: string; input: S; prepare?: (args: unknown) => unknown; run: (input: z.infer<S>) => Promise<string> }): AssistantTool {
  const parameters = z.toJSONSchema(def.input) as Record<string, unknown>
  delete parameters.$schema
  return { ...def, parameters, run: def.run as (input: never) => Promise<string> }
}

const IST = 'Asia/Kolkata'
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
const day = (key: string) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' })
const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/^dr\.?\s+/, '').trim()
// Words that say nothing about which test or doctor is meant.
const FILLER = new Set(['test', 'tests', 'check', 'checkup', 'doctor', 'doctors', 'specialist', 'a', 'an', 'the', 'for', 'in', 'near', 'me', 'blood'])
const words = (q: string) => norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !FILLER.has(w))
// "Cardiologist", "cardiology" and "cardiac" share a stem, as do "pediatrician" and "pediatrics".
const stem = (w: string) => (w.length > 4 ? w.replace(/(ologists?|ologies|ology|icians?|ists?|ics?|ies|y|s)$/, '') : w)
// Everyday words people use for a specialty, as that specialty's stem.
const ALIASES: Record<string, string> = {
  heart: 'cardi', skin: 'dermat', hair: 'dermat', bone: 'orthoped', bones: 'orthoped', joint: 'orthoped', joints: 'orthoped',
  child: 'pediatr', children: 'pediatr', kids: 'pediatr', baby: 'pediatr', eye: 'ophthalm', eyes: 'ophthalm',
  physician: 'medicin', women: 'gynec', pregnancy: 'gynec', dental: 'dent', teeth: 'dent', brain: 'neur', nerves: 'neur',
}
function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}
/** Stems that agree, one extending the other, or differ by a typo (as in "Cadiology"). */
const close = (a: string, b: string) => {
  const n = Math.min(a.length, b.length)
  if (n >= 3 && (a.startsWith(b) || b.startsWith(a))) return true
  return n >= 4 && editDistance(a, b) <= (n >= 8 ? 2 : 1)
}
const matches = (hay: string, q: string) => {
  const h = norm(hay)
  const n = norm(q)
  if (!n || h.includes(n)) return true
  const w = words(q)
  if (!w.length) return false
  const hayStems = h.split(/[^a-z0-9]+/).filter(Boolean).map(stem)
  return w.every((x) => h.includes(x) || hayStems.some((s) => close(s, ALIASES[x] ?? stem(x))))
}

/**
 * Zebrold AI's tools. Search reads only public listing data (active hospitals and labs); get_my_bookings is bound to
 * the signed-in patient's id from the session, never to anything the model or the browser supplies. create_pdf only
 * hands a document to the visitor's browser through `onPdf`.
 */
export function assistantTools({ admin, patientId, onPdf }: { admin: Admin; patientId: string | null; onPdf: (doc: PdfDoc) => void }): AssistantTool[] {
  const searchDoctors = tool({
    name: 'search_doctors',
    status: 'Searching doctors…',
    description:
      'Find doctors who can be booked on the site, with their hospital, city, fee and next open slot. Search by specialty or department (e.g. "cardiology", "orthopedics", "general medicine") or by doctor name, and optionally by city. Leave both empty to list doctors with the soonest open slots.',
    input: z.object({
      query: z.string().max(80).optional().describe('Specialty, department or doctor name'),
      city: z.string().max(60).optional().describe('City, e.g. "Mumbai"'),
    }),
    run: async ({ query, city }) => {
      const { data, error } = await admin
        .from('doctors')
        .select('id, specialty, experience_years, consultation_fee, qualifications, profiles!doctors_profile_id_fkey ( full_name ), departments ( name ), hospitals!inner ( name, city, status )')
        .eq('hospitals.status', 'active')
        .limit(500)
      if (error) return JSON.stringify({ error: 'Doctor search is unavailable right now.' })

      type Row = {
        id: string
        specialty: string | null
        experience_years: number | null
        consultation_fee: number | string | null
        qualifications: string | null
        profiles: Joined<{ full_name: string | null }>
        departments: Joined<{ name: string | null }>
        hospitals: Joined<{ name: string | null; city: string | null }>
      }
      const all = ((data ?? []) as Row[]).map((d) => ({
        id: d.id,
        name: one(d.profiles)?.full_name || 'Doctor',
        specialty: d.specialty,
        department: one(d.departments)?.name ?? null,
        qualifications: d.qualifications,
        experience: d.experience_years,
        fee: d.consultation_fee != null ? Number(d.consultation_fee) : null,
        hospital: one(d.hospitals)?.name ?? null,
        city: one(d.hospitals)?.city ?? null,
      }))
      const found = all.filter(
        (d) => (!city || matches(d.city ?? '', city)) && (!query || [d.name, d.specialty, d.department, d.qualifications].some((v) => matches(v ?? '', query))),
      )

      const ids = found.map((d) => d.id)
      const next = new Map<string, string>()
      if (ids.length) {
        const { data: slots } = await admin
          .from('schedules')
          .select('doctor_id, start_time')
          .in('doctor_id', ids.slice(0, 200))
          .eq('is_booked', false)
          .gt('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1000)
        for (const s of (slots ?? []) as { doctor_id: string; start_time: string }[]) if (!next.has(s.doctor_id)) next.set(s.doctor_id, s.start_time)
      }

      const doctors = found
        .sort((a, b) => Number(next.has(b.id)) - Number(next.has(a.id)) || (next.get(a.id) ?? '').localeCompare(next.get(b.id) ?? '') || (b.experience ?? 0) - (a.experience ?? 0))
        .slice(0, 6)
        .map((d) => ({
          name: d.name,
          specialty: d.specialty ?? d.department,
          qualifications: d.qualifications,
          experience_years: d.experience,
          hospital: d.hospital,
          city: d.city,
          consultation_fee_inr: d.fee,
          next_open_slot_ist: next.has(d.id) ? when(next.get(d.id)!) : null,
          bookable_now: next.has(d.id),
          booking_status: next.has(d.id) ? 'Open slots available to book online' : 'No open slots yet, so this doctor cannot be booked online right now',
          profile_url: `/doctors/${d.id}`,
          booking_url: next.has(d.id) ? `/book/${d.id}` : undefined,
        }))

      if (doctors.length === 0) {
        return JSON.stringify({
          doctors: [],
          note: 'No doctor matched. These are the specialties and cities that do have doctors.',
          available_specialties: Array.from(new Set(all.map((d) => d.specialty ?? d.department).filter(Boolean))).sort(),
          available_cities: Array.from(new Set(all.map((d) => d.city).filter(Boolean))).sort(),
        })
      }
      const bookable = doctors.filter((d) => d.bookable_now).length
      return JSON.stringify({
        summary:
          bookable === 0
            ? `IMPORTANT: none of these ${doctors.length} doctors can be booked online right now, because none has an open slot. Never describe them as bookable or as having open slots, and don't give booking links for them.`
            : `${bookable} of these ${doctors.length} doctors can be booked online now (bookable_now true). Only those have booking links.`,
        doctors,
        total_matches: found.length,
        platform_fee_inr: CONSULTATION_PLATFORM_FEE,
        note: 'Only call a doctor bookable when bookable_now is true. Doctors with no open slot cannot be booked online until their hospital publishes slots; say so plainly.',
      })
    },
  })

  const searchLabs = tool({
    name: 'search_labs',
    status: 'Checking labs and test prices…',
    description:
      'Find diagnostic centers and the price of tests they offer for online booking. Search by test name (e.g. "thyroid", "CBC", "vitamin D", "lipid profile") and optionally by city. Leave the test empty to list centers and their menus.',
    input: z.object({
      test: z.string().max(80).optional().describe('Test name or part of it'),
      city: z.string().max(60).optional().describe('City, e.g. "New Delhi"'),
    }),
    run: async ({ test, city }) => {
      const { data, error } = await admin.from('diagnostic_centers').select('id, name, city, address, available_tests, test_prices').eq('status', 'active').limit(300)
      if (error) return JSON.stringify({ error: 'Lab search is unavailable right now.' })

      type Row = { id: string; name: string | null; city: string | null; address: string | null; available_tests: string[] | null; test_prices: Record<string, number | string> | null }
      const centers = ((data ?? []) as Row[]).filter((c) => !city || matches(c.city ?? '', city))
      const priceOf = (c: Row, name: string) => {
        const n = Number(c.test_prices?.[name])
        return Number.isFinite(n) && n > 0 ? n : null
      }
      const menu = (c: Row) => Array.from(new Set([...(c.available_tests ?? []), ...Object.keys(c.test_prices ?? {})]))

      const labs = centers
        .map((c) => ({ c, tests: menu(c).filter((t) => !test || matches(t, test)).map((t) => ({ name: t, price_inr: priceOf(c, t) })) }))
        .filter((x) => x.tests.length > 0)
        .sort((a, b) => b.tests.filter((t) => t.price_inr).length - a.tests.filter((t) => t.price_inr).length)
        .slice(0, 6)
        .map(({ c, tests }) => ({
          name: c.name ?? 'Diagnostic center',
          city: c.city,
          address: c.address,
          tests: tests.slice(0, 15),
          more_tests: Math.max(0, tests.length - 15),
          booking_url: `/book/diagnostic/${c.id}`,
        }))

      if (labs.length === 0) {
        return JSON.stringify({
          labs: [],
          note: test ? 'No center offers a test with that name. These are tests that are offered.' : 'No diagnostic center found there.',
          available_tests: Array.from(new Set(centers.flatMap(menu))).sort().slice(0, 60),
          available_cities: Array.from(new Set(((data ?? []) as Row[]).map((c) => c.city).filter(Boolean))).sort(),
        })
      }
      return JSON.stringify({ labs, platform_fee_inr: DIAGNOSTIC_PLATFORM_FEE, note: 'Only tests with a price can be booked online.' })
    },
  })

  const createPdf = tool({
    name: 'create_pdf',
    status: 'Preparing your PDF…',
    description:
      'Give the user a downloadable PDF. Use only when they ask for a PDF, printout or document to download, and then call it right away (after any searches it needs) without asking for confirmation. Fill it with information already in this conversation or returned by the other tools: doctor lists, lab tests and prices, the user’s own bookings, step-by-step instructions, or a summary of the chat. Write it in English (or German), not in Hindi script. Never create prescriptions, lab or medical reports, medical certificates, referral letters, invoices, receipts, or anything presented as an official document from a doctor, lab, hospital or Consult Your Doctor.',
    input: PdfDocSchema,
    prepare: preparePdfArgs,
    run: async (doc) => {
      onPdf(doc)
      return JSON.stringify({ ok: true, note: 'The user now sees a Download PDF button for this document. Tell them briefly what it contains.' })
    },
  })

  const tools = [searchDoctors, searchLabs, createPdf]
  if (!patientId) return tools

  const myBookings = tool({
    name: 'get_my_bookings',
    status: 'Checking your bookings…',
    description:
      "List the signed-in patient's own doctor appointments and lab test bookings: upcoming and recent, with status, payment links for unpaid ones, and whether lab reports are ready.",
    input: z.object({}),
    run: async () => {
      const [{ data: appts }, { data: labs }] = await Promise.all([
        admin
          .from('appointments')
          .select('id, status, created_at, doctors ( specialty, profiles!doctors_profile_id_fkey ( full_name ) ), hospitals ( name, city ), schedules ( start_time )')
          .eq('patient_id', patientId)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(20),
        admin
          .from('diagnostic_bookings')
          .select('id, status, test_name, preferred_date, diagnostic_centers ( name, city )')
          .eq('patient_id', patientId)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const VISIT: Record<string, string> = { pending_payment: 'awaiting payment', confirmed: 'booked', visited: 'checked in', completed: 'completed' }
      const LAB: Record<string, string> = {
        pending_payment: 'awaiting payment',
        confirmed: 'booked',
        visited: 'sample collected, report not ready yet',
        completed: 'sample collected, report not ready yet',
        report_sent: 'report ready',
      }
      type Appt = {
        id: string
        status: string
        doctors: Joined<{ specialty: string | null; profiles: Joined<{ full_name: string | null }> }>
        hospitals: Joined<{ name: string | null; city: string | null }>
        schedules: Joined<{ start_time: string }>
      }
      type Lab = { id: string; status: string; test_name: string | null; preferred_date: string | null; diagnostic_centers: Joined<{ name: string | null; city: string | null }> }

      const now = Date.now()
      const visits = ((appts ?? []) as Appt[]).map((a) => {
        const start = one(a.schedules)?.start_time ?? null
        const doctor = one(a.doctors)
        return {
          doctor: one(doctor?.profiles ?? null)?.full_name ?? 'Doctor',
          specialty: doctor?.specialty ?? null,
          hospital: one(a.hospitals)?.name ?? null,
          when_ist: start ? when(start) : null,
          upcoming: start ? Date.parse(start) > now : false,
          status: VISIT[a.status] ?? a.status,
          pay_url: a.status === 'pending_payment' ? `/patient/checkout/${a.id}` : undefined,
        }
      })
      const tests = ((labs ?? []) as Lab[]).map((b) => ({
        tests: b.test_name,
        center: one(b.diagnostic_centers)?.name ?? null,
        day: b.preferred_date ? day(b.preferred_date) : null,
        status: LAB[b.status] ?? b.status,
        pay_url: b.status === 'pending_payment' ? `/patient/checkout/diagnostic/${b.id}` : undefined,
        report_url: b.status === 'report_sent' ? '/patient/profile' : undefined,
      }))
      return JSON.stringify({
        appointments: visits.slice(0, 10),
        lab_bookings: tests.slice(0, 10),
        all_appointments_url: '/patient/appointments',
        note: visits.length + tests.length === 0 ? 'This patient has no bookings yet.' : undefined,
      })
    },
  })

  return [...tools, myBookings]
}
