import type { Metadata } from 'next'
import { ConciergeBell, IdCard, ShieldCheck, Stethoscope, Users } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, istDateKey } from '@/components/patient/format'
import { Card, CardHeader, Chip, StatCard } from '@/components/portal/ui'
import { dayOf, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, requireHospital } from '../_lib/hospital'
import { AddDoctorButton } from '../_components/DoctorDialogs'
import { StaffDirectory, type StaffMember } from '../_components/StaffDirectory'
import { ROLE, type StaffRole } from '../_lib/roles'

export const metadata: Metadata = { title: 'Staff | Hospital Portal' }
export const dynamic = 'force-dynamic'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many} this month`

type ProfileRow = { id: string; full_name: string | null; email: string | null; phone_number: string | null; role: string; staff_id: string | null; created_at: string | null }

export default async function HospitalStaffPage() {
  const { admin, hospital, user } = await requireHospital()
  const now = currentTime()
  const month = istDateKey(now).slice(0, 7)

  const doctors = await loadHospitalDoctors(admin, hospital.id)
  const [{ data: profiles }, visits] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, phone_number, role, staff_id, created_at')
      .eq('hospital_id', hospital.id)
      .in('role', ['hospital_admin', 'doctor', 'executive']),
    loadHospitalVisits(admin, hospital.id, doctors.map((d) => d.id)),
  ])

  const thisMonth = visits.filter((v) => isPaidVisit(v) && dayOf(v.start ?? v.createdAt)?.startsWith(month))
  const consults = (doctorId: string) => thisMonth.filter((v) => v.doctorId === doctorId).length
  const handled = (executiveId: string) => thisMonth.filter((v) => v.executiveId === executiveId).length
  const realEmail = (e: string | null) => (e && !e.endsWith('.internal') ? e : null)

  const doctorByProfile = new Map(doctors.map((d) => [d.profileId, d]))
  const staff: StaffMember[] = ((profiles ?? []) as ProfileRow[]).map((p) => {
    const d = doctorByProfile.get(p.id)
    const role = p.role as StaffRole
    return {
      id: p.id,
      name: role === 'doctor' ? doctorName(p.full_name) : p.full_name || 'Staff member',
      image: d?.image ?? null,
      staffId: p.staff_id,
      role,
      department: d?.department ?? (role === 'executive' ? 'Front desk' : role === 'hospital_admin' ? 'Administration' : null),
      phone: p.phone_number,
      email: realEmail(p.email),
      joined: p.created_at,
      activity: d ? plural(consults(d.id), 'consultation') : role === 'executive' ? plural(handled(p.id), 'booking handled', 'bookings handled') : null,
      isYou: p.id === user.id,
      doctor: d
        ? { id: d.id, name: doctorName(d.name), phone: d.phone, specialty: d.specialty, experience: d.experience, fee: d.fee, qualifications: d.qualifications, address: d.address, bio: d.bio }
        : null,
    }
  })
  // Doctors attached to this hospital whose login isn't tagged with it
  for (const d of doctors) {
    if (staff.some((s) => s.id === d.profileId)) continue
    staff.push({
      id: d.profileId || d.id,
      name: doctorName(d.name),
      image: d.image,
      staffId: d.staffId,
      role: 'doctor',
      department: d.department,
      phone: d.phone,
      email: d.email,
      joined: d.joined,
      activity: plural(consults(d.id), 'consultation'),
      isYou: false,
      doctor: { id: d.id, name: doctorName(d.name), phone: d.phone, specialty: d.specialty, experience: d.experience, fee: d.fee, qualifications: d.qualifications, address: d.address, bio: d.bio },
    })
  }
  const order: Record<StaffRole, number> = { hospital_admin: 0, doctor: 1, executive: 2 }
  staff.sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name))

  const count = (r: StaffRole) => staff.filter((s) => s.role === r).length
  const joinedThisMonth = staff.filter((s) => s.joined?.slice(0, 7) === month).length
  const departments = Array.from(new Set(doctors.map((d) => d.department))).sort()
  const perDept = departments.map((dept) => ({ dept, n: doctors.filter((d) => d.department === dept).length })).sort((a, b) => b.n - a.n)
  const deptMax = Math.max(1, ...perDept.map((p) => p.n))

  return (
    <>
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Role-based access
          </span>
          <h1 className="font-headline-lg text-[24px] md:text-headline-lg text-indigo-gray-900 font-bold tracking-tight mt-2">Staff &amp; Access</h1>
          <p className="text-sm md:text-body-md text-indigo-gray-600 max-w-3xl">Everyone who signs in for {hospital.name}, their role and what each role can see.</p>
        </div>
        <AddDoctorButton
          departments={departments}
          className="self-start lg:self-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm text-label-sm shadow-md"
        />
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 md:gap-gutter">
        <StatCard label="Total Staff" value={staff.length} note={joinedThisMonth ? `+${joinedThisMonth} this month` : undefined} icon={Users} tone="blue" footer={<span className="text-[11px] text-indigo-gray-600">Logins linked to your hospital</span>} />
        <StatCard label="Doctors" value={count('doctor')} note={`${departments.length} depts`} noteTone="neutral" icon={Stethoscope} tone="teal" footer={<span className="text-[11px] text-indigo-gray-600">Listed for patient booking</span>} />
        <StatCard label="Front Desk" value={count('executive')} icon={ConciergeBell} tone="neutral" footer={<span className="text-[11px] text-indigo-gray-600">Walk-ins and desk payments</span>} />
        <StatCard label="Admins" value={count('hospital_admin')} icon={IdCard} tone="coral" footer={<span className="text-[11px] text-indigo-gray-600">Full access to this portal</span>} />
      </section>

      <StaffDirectory staff={staff} departments={departments} />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-gutter items-start">
        <Card className="lg:col-span-5">
          <CardHeader title="Doctors by Department" subtitle="How your consultants are spread" action={<Chip tone="blue">{doctors.length}</Chip>} />
          {perDept.length === 0 ? (
            <p className="p-4 rounded-xl bg-surface-container-low text-sm text-indigo-gray-600 text-center">No doctors yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {perDept.map(({ dept, n }) => (
                <li key={dept} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="font-semibold text-indigo-gray-900">{dept}</span>
                    <span className="text-indigo-gray-600 font-semibold">
                      {n} ({Math.round((n / Math.max(1, doctors.length)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${(n / deptMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader title="What Each Role Can Access" subtitle="Enforced on every page and action" />
          <ul className="flex flex-col gap-2.5">
            {(Object.keys(ROLE) as StaffRole[]).map((r) => (
              <li key={r} className="p-3.5 rounded-xl bg-surface-container-low flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block font-title-md text-[15px] font-bold text-indigo-gray-900">{ROLE[r].label}</span>
                  <span className="block text-[13px] text-indigo-gray-600">{ROLE[r].access}</span>
                </div>
                <Chip tone={ROLE[r].tone}>{count(r)}</Chip>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-indigo-gray-600 mt-3">You can add doctors here. Front-desk and admin logins are created by the Consult Your Doctor team.</p>
        </Card>
      </section>
    </>
  )
}
