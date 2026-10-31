import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { doctorName, istDateKey } from '@/components/patient/format'
import { dayOf, isPaidVisit, loadHospitalDoctors, loadHospitalVisits, requireHospital } from '../_lib/hospital'
import { StaffDirectory, type StaffMember } from '../_components/StaffDirectory'
import { ROLE, type StaffRole } from '../_lib/roles'
import { EmptyLine, Meter, Panel, PanelHead, StatCard, plural as countOf } from '../_components/hos-ui'

export const metadata: Metadata = { title: 'Staff | Hospital Portal' }
export const dynamic = 'force-dynamic'

const monthly = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many} this month`

type ProfileRow = { id: string; full_name: string | null; email: string | null; phone_number: string | null; role: string; staff_id: string | null; created_at: string | null }

export default async function HospitalStaffPage() {
  const { admin, hospital, user, staff: viewer } = await requireHospital()
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
      activity: d ? monthly(consults(d.id), 'consultation') : role === 'executive' ? monthly(handled(p.id), 'booking handled', 'bookings handled') : null,
      isYou: p.id === user.id,
      doctor: d
        ? {
            id: d.id,
            name: doctorName(d.name),
            phone: d.phone,
            specialty: d.specialty,
            experience: d.experience,
            fee: d.fee,
            qualifications: d.qualifications,
            address: d.address,
            bio: d.bio,
            staffId: p.staff_id || d.staffId,
            email: realEmail(p.email) || d.email,
            image: d.image,
            hospitalName: hospital.name,
          }
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
      activity: monthly(consults(d.id), 'consultation'),
      isYou: false,
      doctor: {
        id: d.id,
        name: doctorName(d.name),
        phone: d.phone,
        specialty: d.specialty,
        experience: d.experience,
        fee: d.fee,
        qualifications: d.qualifications,
        address: d.address,
        bio: d.bio,
        staffId: d.staffId,
        email: d.email,
        image: d.image,
        hospitalName: hospital.name,
      },
    })
  }
  const order: Record<StaffRole, number> = { hospital_admin: 0, doctor: 1, executive: 2 }
  staff.sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name))

  const count = (r: StaffRole) => staff.filter((s) => s.role === r).length
  const joinedThisMonth = staff.filter((s) => s.joined?.slice(0, 7) === month).length
  const departments = Array.from(new Set(doctors.map((d) => d.department))).sort()
  const perDept = departments.map((dept) => ({ dept, n: doctors.filter((d) => d.department === dept).length })).sort((a, b) => b.n - a.n)
  const deptMax = Math.max(1, ...perDept.map((p) => p.n))

  const totalStats = { all: staff.length, doctor: count('doctor'), executive: count('executive'), admin: count('hospital_admin') }

  return (
    <StaffDirectory
      staff={staff}
      departments={departments}
      viewer={viewer}
      hospitalName={hospital.name}
      stats={[
        { label: 'Total staff', value: totalStats.all, note: joinedThisMonth ? `+${joinedThisMonth} this month` : 'logins linked to hospital' },
        { label: 'Doctors', value: totalStats.doctor, note: 'listed for booking', color: ROLE.doctor.color },
        { label: 'Front desk', value: totalStats.executive, note: 'walk-ins & payments', color: ROLE.executive.color },
        { label: 'Admins', value: totalStats.admin, note: 'full access', color: ROLE.hospital_admin.color },
      ]}
      deskStats={
        <section className="hidden lg:grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Total staff" value={totalStats.all} note={joinedThisMonth ? `${joinedThisMonth} joined this month` : 'Logins linked to your hospital'} />
          <StatCard label="Doctors" value={totalStats.doctor} note={`Listed for booking · ${countOf(departments.length, 'department')}`} />
          <StatCard label="Front desk" value={totalStats.executive} note="Walk-ins and desk payments" />
          <StatCard label="Admins" value={totalStats.admin} note="Full access to this portal" />
        </section>
      }
    >
      <section className="mt-3.5 lg:mt-5">
        <Panel>
          <PanelHead title="Doctors by department" sub="How your consultants are spread" />
          {perDept.length === 0 ? (
            <EmptyLine>No doctors yet.</EmptyLine>
          ) : (
            perDept.map(({ dept, n }) => (
              <div key={dept} className="py-2.5 border-t border-[#EEF2F7]">
                <div className="flex justify-between gap-3 mb-1.5 text-[13.5px]">
                  <span className="font-extrabold truncate">{dept}</span>
                  <span className="font-bold text-[#5B667A] shrink-0">{countOf(n, 'doctor')}</span>
                </div>
                <Meter pct={(n / deptMax) * 100} label={`${dept}: ${countOf(n, 'doctor')}`} />
              </div>
            ))
          )}
        </Panel>
      </section>
    </StaffDirectory>
  )
}
