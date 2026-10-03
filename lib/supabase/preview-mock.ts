// TEMP-PREVIEW: sample data for local screenshots only. Delete this file after verification.
/* eslint-disable @typescript-eslint/no-explicit-any */

const MIN = 60_000
const D = 86_400_000
const now = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()
const half = Math.floor(now / (30 * MIN)) * 30 * MIN
// 9:00 IST today
const nine = Date.parse(`${new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T09:00:00+05:30`)

const hospital = { id: 'h1', name: 'City General Hospital', city: 'Mumbai', address: 'Tower A, Bandra Kurla Complex', image_url: null, contact_phone: '+912240001111', contact_email: 'info@citygeneral.internal', status: 'active' }

const dept = (name: string) => ({ name })
const docProfile = (id: string, name: string, phone: string | null, staff: string, created: number) => ({ id, full_name: name, phone_number: phone, email: `${staff.toLowerCase()}@cyd.internal`, staff_id: staff, created_at: iso(created), role: 'doctor', hospital_id: 'h1' })
const doctorsP = [
  docProfile('u-d1', 'Dr. Sarah Jenkins', '+919820100001', 'CYDSJ1024', now - 300 * D),
  docProfile('u-d2', 'Dr. Rajesh Sharma', '+919820100002', 'CYDRS2208', now - 200 * D),
  docProfile('u-d3', 'Dr. Ananya Mehta', null, 'CYDAM1844', now - 40 * D),
  docProfile('u-d4', 'Dr. Rohit Kapoor', '+919820100004', 'CYDRK3319', now - 5 * D),
]
const doctors = [
  { id: 'd1', profile_id: 'u-d1', hospital_id: 'h1', specialty: 'Cardiology', experience_years: 14, consultation_fee: 900, image_url: null, qualifications: 'MD, DM (Cardiology)', bio: null, address: 'OPD B-204', profiles: doctorsP[0], departments: dept('Cardiology') },
  { id: 'd2', profile_id: 'u-d2', hospital_id: 'h1', specialty: 'General Medicine', experience_years: 22, consultation_fee: 600, image_url: null, qualifications: 'MD (General Medicine)', bio: null, address: null, profiles: doctorsP[1], departments: dept('General Medicine') },
  { id: 'd3', profile_id: 'u-d3', hospital_id: 'h1', specialty: 'Pediatrics', experience_years: 9, consultation_fee: 700, image_url: null, qualifications: 'MBBS, MD', bio: null, address: null, profiles: doctorsP[2], departments: dept('Pediatrics') },
  { id: 'd4', profile_id: 'u-d4', hospital_id: 'h1', specialty: 'Orthopaedics', experience_years: 11, consultation_fee: 800, image_url: null, qualifications: 'MS (Ortho)', bio: null, address: null, profiles: doctorsP[3], departments: dept('Orthopaedics') },
]

const patients = [
  { id: 'p1', full_name: 'Eleanor Vance', phone_number: '+919820000001', email: 'eleanor@example.com' },
  { id: 'p2', full_name: 'Devon Kapoor', phone_number: '+919820000002', email: null },
  { id: 'p3', full_name: 'Siddharth Logan', phone_number: '+919820000003', email: null },
  { id: 'p4', full_name: 'Amara Patel', phone_number: null, email: 'amara@example.com' },
  { id: 'p5', full_name: 'Harold Lewis', phone_number: '+919820000005', email: null },
  { id: 'p6', full_name: 'Maria Santos', phone_number: '+919820000006', email: null },
]

let sid = 0
const schedules: any[] = []
const slot = (doctor: string, start: number, booked: boolean, mins = 30) => {
  const s = { id: `s${++sid}`, doctor_id: doctor, start_time: iso(start), end_time: iso(start + mins * MIN), is_booked: booked }
  schedules.push(s)
  return s
}
// Today: d1 9:00-13:00, d2 around now, d3 evening; tomorrow d1 & d2; d4 nothing this week
for (let i = 0; i < 8; i++) slot('d1', nine + i * 30 * MIN, i % 3 === 0)
for (let i = -3; i < 4; i++) slot('d2', half + i * 30 * MIN, i === 0 || i === -2 || i === 1)
for (let i = 0; i < 4; i++) slot('d3', nine + 9 * 60 * MIN + i * 30 * MIN, i === 1)
for (let i = 0; i < 6; i++) slot('d1', nine + D + i * 30 * MIN, i < 2)
for (let i = 0; i < 6; i++) slot('d2', nine + 2 * D + i * 30 * MIN, i === 3)

const byStart = (doctor: string, start: number) => schedules.find((s) => s.doctor_id === doctor && Date.parse(s.start_time) === start)
let aid = 0
const appointments: any[] = []
const payments: any[] = []
const appt = (patient: number, doctor: string, status: string, s: any, pay?: { gateway: string; amount: number; at?: number }, executive?: string) => {
  const id = `a${String(++aid).padStart(7, '0')}-bbbb-4000-8000-000000000000`
  appointments.push({ id, status, created_at: iso(Date.parse(s.start_time) - 2 * D), doctor_id: doctor, hospital_id: 'h1', executive_id: executive ?? null, schedules: { start_time: s.start_time, end_time: s.end_time }, patient: patients[patient] })
  if (pay) payments.push({ appointment_id: id, amount: pay.amount, gateway: pay.gateway, status: 'success', created_at: iso(pay.at ?? Date.parse(s.start_time) - D) })
}
appt(0, 'd1', 'completed', byStart('d1', nine), { gateway: 'payu', amount: 949, at: now - 2 * 3600_000 })
appt(1, 'd1', 'visited', byStart('d1', nine + 90 * MIN), { gateway: 'cash', amount: 900, at: now - 3600_000 }, 'u-e1')
appt(2, 'd2', 'visited', byStart('d2', half), { gateway: 'payu', amount: 649, at: now - 4 * 3600_000 })
appt(3, 'd2', 'confirmed', byStart('d2', half - 60 * MIN), { gateway: 'payu', amount: 649, at: now - D })
appt(4, 'd2', 'pending_payment', byStart('d2', half + 30 * MIN))
appt(5, 'd3', 'confirmed', byStart('d3', nine + 9 * 60 * MIN + 30 * MIN), { gateway: 'payu', amount: 749, at: now - D })
appt(0, 'd1', 'confirmed', byStart('d1', nine + D), { gateway: 'payu', amount: 949, at: now - 3 * 3600_000 })
appt(4, 'd1', 'confirmed', byStart('d1', nine + D + 30 * MIN), { gateway: 'cash', amount: 900, at: now - 5 * 3600_000 }, 'u-e1')
// history
const past = (days: number, doctor: string) => slot(doctor, nine - days * D, true)
appt(1, 'd2', 'completed', past(6, 'd2'), { gateway: 'payu', amount: 649, at: nine - 7 * D })
appt(2, 'd4', 'completed', past(12, 'd4'), { gateway: 'cash', amount: 800, at: nine - 12 * D }, 'u-e1')
appt(3, 'd3', 'completed', past(20, 'd3'), { gateway: 'payu', amount: 749, at: nine - 21 * D })
appt(5, 'd1', 'completed', past(35, 'd1'), { gateway: 'payu', amount: 949, at: nine - 36 * D })
appt(4, 'd2', 'completed', past(3, 'd2'))

const patient_details = [
  { id: 'p1', blood_group: 'B+', date_of_birth: '1967-06-02', gender: 'Female', address: null, emergency_contact_name: null, emergency_contact_relation: null, emergency_contact_phone: null },
  { id: 'p2', blood_group: 'O+', date_of_birth: '1983-11-20', gender: 'Male', address: null, emergency_contact_name: null, emergency_contact_relation: null, emergency_contact_phone: null },
  { id: 'p5', blood_group: null, date_of_birth: '1954-03-14', gender: 'Male', address: null, emergency_contact_name: null, emergency_contact_relation: null, emergency_contact_phone: null },
]

const profiles = [
  { id: 'u-admin', full_name: 'Alistair Finch', email: 'alistair@citygeneral.in', phone_number: '+919820199999', role: 'hospital_admin', hospital_id: 'h1', staff_id: 'CYDAF0001', created_at: iso(now - 400 * D) },
  { id: 'u-e1', full_name: 'Amina Khan', email: null, phone_number: '+919820188888', role: 'executive', hospital_id: 'h1', staff_id: 'CYDAK4109', created_at: iso(now - 90 * D) },
  ...doctorsP,
  ...patients.map((p) => ({ ...p, role: 'patient' })),
]

const tables: Record<string, any[]> = { hospitals: [hospital], doctors, appointments, payments, schedules, patient_details, profiles, departments: [] }
const user = { id: 'u-admin', email: 'alistair@citygeneral.in', phone: null, user_metadata: { full_name: 'Alistair Finch' } }

function builder(table: string) {
  let rows = [...(tables[table] ?? [])]
  let single = false
  const has = (r: any, k: string) => Object.prototype.hasOwnProperty.call(r, k)
  const api: any = {
    select: () => api,
    eq: (k: string, v: any) => ((rows = rows.filter((r) => !has(r, k) || r[k] === v)), api),
    neq: (k: string, v: any) => ((rows = rows.filter((r) => !has(r, k) || r[k] !== v)), api),
    in: (k: string, v: any[]) => ((rows = rows.filter((r) => !has(r, k) || v.includes(r[k]))), api),
    gt: (k: string, v: any) => ((rows = rows.filter((r) => !has(r, k) || r[k] > v)), api),
    gte: (k: string, v: any) => ((rows = rows.filter((r) => !has(r, k) || r[k] >= v)), api),
    lt: (k: string, v: any) => ((rows = rows.filter((r) => !has(r, k) || r[k] < v)), api),
    lte: () => api,
    or: () => api,
    not: () => api,
    order: (k: string, o?: { ascending?: boolean }) => {
      rows.sort((a, b) => (String(a[k] ?? '') < String(b[k] ?? '') ? -1 : 1) * (o?.ascending === false ? -1 : 1))
      return api
    },
    limit: (n: number) => ((rows = rows.slice(0, n)), api),
    single: () => ((single = true), api),
    maybeSingle: () => ((single = true), api),
    update: () => api,
    upsert: () => api,
    insert: () => api,
    delete: () => api,
    then: (resolve: any, reject: any) => Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject),
  }
  return api
}

export function previewClient(): any {
  return {
    from: (t: string) => builder(t),
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), createSignedUrls: async () => ({ data: [], error: null }) }) },
  }
}
