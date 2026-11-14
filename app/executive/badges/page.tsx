import type { Metadata } from 'next'
import { BadgeCheck, Check, Hourglass, X } from 'lucide-react'
import { currentTime } from '@/components/patient/data'
import { doctorName, formatINR, formatShortDate } from '@/components/patient/format'
import { ACTIVE_DAYS_NEEDED, BADGE_COLUMNS, BADGE_PRICES, PLAN_LABEL, doctorRequirements, toBadge, type Badge, type BadgePlan } from '@/lib/badges'
import { requireExecutivePage } from '../_lib/ops'
import { Card, EmptyState, ExePage, Initials, Line, Stat, Stats, Status, Table, Verified, plural, td, th } from '../_components/ui'
import { BadgeReview } from '../_components/BadgeReview'

export const metadata: Metadata = { title: 'Verified badges' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

/**
 * Verified badges after DeskExeBadges: paid badges waiting for a check (the team confirms the doctor's registration with
 * the medical council and their photo ID, or the hospital's listing, then approves so the blue tick shows, or rejects and
 * refunds from Razorpay), and the badges showing now.
 */
export default async function ExecutiveBadgesPage() {
  const { admin, profile } = await requireExecutivePage('badges')
  const now = currentTime()
  const monthStart = new Date(`${new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)}-01T00:00:00+05:30`).toISOString()
  const [review, active, month] = await Promise.all([
    admin.from('verified_badges').select(BADGE_COLUMNS).eq('status', 'in_review').order('created_at', { ascending: true }).limit(200),
    admin.from('verified_badges').select(BADGE_COLUMNS).eq('status', 'active').gt('ends_at', new Date(now).toISOString()).order('ends_at', { ascending: true }).limit(200),
    admin.from('verified_badges').select('amount').in('status', ['in_review', 'active']).gte('created_at', monthStart).limit(5000),
  ])
  if (review.error) {
    return (
      <ExePage name={profile.fullName} title="Verified badges" subtitle="Check paid badge requests from doctors and hospitals, and see the badges showing now">
        <Card title="Badges aren’t switched on yet">
          <EmptyState icon={BadgeCheck}>Run supabase/migrations/20261114_grow_and_manage.sql to start verified badges.</EmptyState>
        </Card>
      </ExePage>
    )
  }
  const waiting = ((review.data ?? []) as Parameters<typeof toBadge>[0][]).map(toBadge)
  const live = ((active.data ?? []) as Parameters<typeof toBadge>[0][]).map(toBadge)
  const all = [...waiting, ...live]
  const monthRevenue = ((month.data ?? []) as { amount: number | string }[]).reduce((s, b) => s + (Number(b.amount) || 0), 0)
  // Renewals: a badge in its last 7 days is renewed when another paid one for the same doctor or hospital is waiting
  // to be checked or runs on after it. Reminders go out by email (app/api/cron/badge-reminders).
  const subjectKey = (b: Badge) => `${b.subject}:${b.subject === 'doctor' ? b.doctorId : b.hospitalId}`
  const renewed = (b: Badge) => all.some((x) => x.id !== b.id && subjectKey(x) === subjectKey(b) && (x.status === 'in_review' || (x.startsAt && b.endsAt && Date.parse(x.startsAt) >= Date.parse(b.endsAt) - DAY)))
  const endingSoon = live.filter((b) => b.endsAt && Date.parse(b.endsAt) - now < 7 * DAY)
  const notRenewed = endingSoon.filter((b) => !renewed(b))
  const remindedRes = endingSoon.length ? await admin.from('verified_badges').select('id, reminded_at').in('id', endingSoon.map((b) => b.id)) : { data: [], error: null }
  const reminded = new Map(((remindedRes.error ? [] : remindedRes.data) as { id: string; reminded_at: string | null }[] | null ?? []).map((r) => [r.id, r.reminded_at]))

  const doctorIds = [...new Set(all.map((b) => b.doctorId).filter(Boolean))] as string[]
  const hospitalIds = [...new Set(all.map((b) => b.hospitalId).filter(Boolean))] as string[]
  const [{ data: doctors }, { data: hospitals }] = await Promise.all([
    doctorIds.length ? admin.from('doctors').select('*, profiles!doctors_profile_id_fkey ( full_name, created_at ), hospitals ( name )').in('id', doctorIds) : Promise.resolve({ data: [] }),
    hospitalIds.length ? admin.from('hospitals').select('id, name, city, status').in('id', hospitalIds) : Promise.resolve({ data: [] }),
  ])
  type D = { id: string; image_url: string | null; registration_number?: string | null; registration_council?: string | null; specialty: string | null; profiles: { full_name: string | null; created_at: string | null } | null; hospitals: { name: string | null } | null }
  const docById = new Map(((doctors ?? []) as unknown as D[]).map((d) => [d.id, d]))
  const hosById = new Map(((hospitals ?? []) as { id: string; name: string | null; city: string | null; status: string | null }[]).map((h) => [h.id, h]))

  const describe = (b: Badge) => {
    if (b.subject === 'hospital') {
      const h = b.hospitalId ? hosById.get(b.hospitalId) : undefined
      return { title: h?.name ?? 'Hospital', image: null, sub: ['Hospital', h?.city, h?.status === 'active' ? 'Live' : 'Not listed'].filter(Boolean).join(' · '), checks: [] as { label: string; met: boolean | null; note?: string }[] }
    }
    const d = b.doctorId ? docById.get(b.doctorId) : undefined
    const reqs = d ? doctorRequirements({ registrationNumber: d.registration_number ?? null, image: d.image_url, joined: d.profiles?.created_at ?? null }, now) : []
    return {
      title: doctorName(d?.profiles?.full_name ?? 'Doctor'),
      image: d?.image_url ?? null,
      sub: ['Doctor', d?.specialty, d?.hospitals?.name, d?.registration_number ? `Reg. ${d.registration_number}${d.registration_council ? `, ${d.registration_council}` : ''}` : 'No registration number'].filter(Boolean).join(' · '),
      checks: reqs,
    }
  }

  const prices = (Object.entries(BADGE_PRICES) as [Badge['subject'], Partial<Record<BadgePlan, number>>][]).flatMap(([subject, plans]) =>
    (Object.entries(plans) as [BadgePlan, number][]).map(([plan, price]) => ({ label: `${subject === 'doctor' ? 'Doctor' : 'Hospital'}, ${PLAN_LABEL[plan].toLowerCase()}`, price })),
  )

  return (
    <ExePage name={profile.fullName} title="Verified badges" subtitle="Check paid badge requests from doctors and hospitals, and see the badges showing now">
      <Stats>
        <Stat label="Waiting to verify" value={waiting.length} note="Paid, not yet active" tone={waiting.length ? 'warn' : undefined} />
        <Stat label="Active badges" value={live.length} note={`${plural(live.filter((b) => b.subject === 'doctor').length, 'doctor')} · ${plural(live.filter((b) => b.subject === 'hospital').length, 'hospital')}`} />
        <Stat label="Badge revenue" value={formatINR(monthRevenue)} note="This month" tone="blue" />
        <Stat label="Renewals in 7 days" value={endingSoon.length} note={endingSoon.length ? `${notRenewed.length} not renewed yet` : 'Badges don’t renew by themselves'} tone={notRenewed.length ? 'warn' : undefined} />
      </Stats>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3.5 lg:gap-5 items-start">
        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Requests to verify" sub="Badges go live only after these checks. Oldest first.">
            {waiting.length === 0 ? (
              <EmptyState icon={Hourglass}>Nothing waiting.</EmptyState>
            ) : (
              <ul>
                {waiting.map((b) => {
                  const d = describe(b)
                  return (
                    <li key={b.id} className="flex flex-col gap-3 py-4 border-t border-[#EEF2F7] first:border-t-0 first:pt-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Initials name={d.title} image={d.image} className="w-10 h-10 text-[13px]" />
                        <div className="min-w-0">
                          <p className="text-[14.5px] font-extrabold">{d.title}</p>
                          <p className="text-[12.5px] text-[#5B667A]">{d.sub}</p>
                          <p className="text-[12.5px] text-[#5B667A]">
                            {PLAN_LABEL[b.plan]} · {formatINR(b.amount)} · paid by the {b.paidBy} · {formatShortDate(b.createdAt)}
                          </p>
                          {d.checks.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-1">
                              {d.checks.map((c) => (
                                <li key={c.label} className={`flex items-start gap-1.5 text-[12.5px] font-bold ${c.met === false ? 'text-[#B42318]' : c.met ? 'text-[#067647]' : 'text-[#5B667A]'}`}>
                                  {c.met === false ? <X className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={3} /> : c.met ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={3} /> : <span className="w-3.5 text-center shrink-0">•</span>}
                                  <span>
                                    {c.label}
                                    {c.note && <span className="font-medium text-[#5B667A]"> · {c.note}</span>}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <BadgeReview badgeId={b.id} />
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="Active badges" sub="Soonest to end first">
            {live.length === 0 ? (
              <EmptyState icon={BadgeCheck}>No live badges yet.</EmptyState>
            ) : (
              <Table min={720}>
                <thead>
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Ends</th>
                    <th className={th}>Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((b) => {
                    const d = describe(b)
                    const soon = b.endsAt && Date.parse(b.endsAt) - now < 7 * DAY
                    return (
                      <tr key={b.id}>
                        <td className={td}>
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Verified size={18} />
                            <span className="min-w-0">
                              <span className="block font-extrabold truncate">{d.title}</span>
                              <span className="block text-[12px] text-[#5B667A] truncate max-w-[340px]">{d.sub}</span>
                            </span>
                          </span>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          {PLAN_LABEL[b.plan]} {formatINR(b.amount)}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>{soon ? <Status label={`Ends ${formatShortDate(b.endsAt!)}`} color="#B54708" /> : `Ends ${formatShortDate(b.endsAt!)}`}</td>
                        <td className={`${td} whitespace-nowrap`}>
                          {renewed(b) ? (
                            <Status label="Renewed" color="#2A4DD0" />
                          ) : soon ? (
                            <Status label={reminded.get(b.id) ? `Reminded ${formatShortDate(reminded.get(b.id)!)}` : 'Not renewed yet'} color="#B54708" />
                          ) : (
                            <span className="text-[#98A2B3]">Opens 7 days before the end</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-3.5 lg:gap-5 min-w-0">
          <Card title="Prices" sub="Shown to doctors and hospitals">
            <ul>
              {prices.map((p) => (
                <li key={p.label}>
                  <Line label={<span className="font-bold">{p.label}</span>} right={<strong className="tabular-nums">{formatINR(p.price)}</strong>} />
                </li>
              ))}
            </ul>
          </Card>
          <Card title="What we check">
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {[
                'Medical registration matches the state council record',
                'Government photo ID matches the profile name (ask for it if it isn’t on file)',
                'A profile photo is on the profile',
                `Active on the platform for at least ${ACTIVE_DAYS_NEEDED} days`,
                'Hospitals: listed and live on Consult your Doctor',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-[#2A4DD0] shrink-0" strokeWidth={2.6} />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </ExePage>
  )
}
