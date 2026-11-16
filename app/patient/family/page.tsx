import type { Metadata } from 'next'
import { currentTime } from '@/components/patient/data'
import { AccountPage } from '@/components/patient/AccountPage'
import { card } from '@/components/patient/app-ui'
import { ageFrom, doctorName, formatShortDate } from '@/components/patient/format'
import { AddMember, MemberCard } from '@/components/patient/health/family'
import { patientAccount } from '@/lib/patient-account'
import { loadFamily, loadHealthDetails, RELATIONS } from '@/lib/patient-health'
import { loadPatientVisits } from '@/lib/patient-visits'
import { loadInsurance } from '@/lib/insurance'

export const metadata: Metadata = { title: 'Family members' }

const DONE = new Set(['cancelled', 'refunded', 'completed', 'visited', 'no_show', 'pending_payment'])

/** Family members: the account holder and the people they book for, with their next visit and insurance cover. */
export default async function FamilyPage() {
  const { user, admin, profile, name } = await patientAccount('/patient/family')
  const [details, { ready, members }, visits, { policy }] = await Promise.all([
    loadHealthDetails(admin, user.id),
    loadFamily(admin, user.id),
    loadPatientVisits(admin, user.id),
    loadInsurance(admin, user.id),
  ])
  const now = currentTime()

  // The next visit booked for each person (the account holder's are the ones without a family member).
  const next = new Map<string, string>()
  for (const v of [...visits].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))) {
    if (!v.at || DONE.has(v.status) || Date.parse(v.at) < now) continue
    const key = v.familyMemberId ?? 'me'
    if (!next.has(key)) next.set(key, `${v.doctor?.specialty || doctorName(v.doctor?.name)} · ${formatShortDate(v.at)}`)
  }
  const describe = (relation: string, dob: string | null, gender: string | null) =>
    [relation, ageFrom(dob, now) != null ? `${ageFrom(dob, now)} yrs` : null, gender].filter(Boolean).join(' · ')

  const people = [
    {
      member: null,
      name,
      line: describe('You', details.dateOfBirth, details.gender),
      bloodGroup: details.bloodGroup,
      covered: policy ? true : null,
      nextVisit: next.get('me') ?? null,
    },
    ...members.map((m) => ({
      member: m,
      name: m.name,
      line: describe(RELATIONS[m.relation], m.dateOfBirth, m.gender),
      bloodGroup: m.bloodGroup,
      covered: policy ? policy.coveredMemberIds.includes(m.id) : null,
      nextVisit: next.get(m.id) ?? null,
    })),
  ]

  return (
    <AccountPage
      user={user}
      profile={profile}
      wide
      title="Family members"
      subtitle="Book care and keep records for the people you look after"
      phoneSubtitle="Book care and keep records for your family."
    >
      <div className="grid gap-3.5 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="grid gap-3.5 lg:gap-5 md:grid-cols-2 min-w-0">
          {people.map((p) => (
            <MemberCard key={p.member?.id ?? 'me'} person={p} />
          ))}
        </div>
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <AddMember count={members.length} ready={ready} />
          <section className={`${card} p-4 lg:p-[22px]`}>
            <h2 className="text-[16px] font-extrabold">Good to know</h2>
            <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-[#27324A] list-disc pl-5">
              <li>Bookings for a family member are made and paid from your account, and the slip comes to you.</li>
              <li>Doctors see who the visit is for. Records you upload can be filed under each person.</li>
              <li>Add family members to your policy from the Insurance page.</li>
              <li>Grown-up family members can also make their own account with their mobile number.</li>
            </ul>
          </section>
        </div>
      </div>
    </AccountPage>
  )
}
