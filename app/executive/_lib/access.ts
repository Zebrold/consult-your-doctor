// Executive teams and the pages each may open (supabase/migrations/20261115_executive_workspace.sql). Plain values,
// safe for server pages and the client sidebar alike.

export type Team = 'management' | 'operations' | 'finance' | 'support'

export const TEAMS: { id: Team; label: string; sub: string }[] = [
  { id: 'management', label: 'Management', sub: 'Every page, and the only team that can change access' },
  { id: 'operations', label: 'Operations', sub: 'Partners, bookings and patients' },
  { id: 'finance', label: 'Finance', sub: 'Payments, wallets and revenue' },
  { id: 'support', label: 'Support', sub: 'Tickets and patient follow-up' },
]
export const TEAM_LABEL: Record<Team, string> = { management: 'Management', operations: 'Operations', finance: 'Finance', support: 'Support' }
export const isTeam = (v: unknown): v is Team => v === 'management' || v === 'operations' || v === 'finance' || v === 'support'

/** Pages a team can be given. Command, Settings and Policies are open to everyone; Staff & access only to Management. */
export const PAGES = [
  { key: 'payments', label: 'Payments', href: '/executive/payments' },
  { key: 'wallets', label: 'Wallets', href: '/executive/wallets' },
  { key: 'support', label: 'Support', href: '/executive/support' },
  { key: 'hospitals', label: 'Hospitals', href: '/executive/hospitals' },
  { key: 'doctors', label: 'Doctors', href: '/executive/doctors' },
  { key: 'diagnostics', label: 'Diagnostics', href: '/executive/diagnostics' },
  { key: 'patients', label: 'Patients', href: '/executive/patients' },
  { key: 'revenue', label: 'Revenue', href: '/executive/revenue' },
  { key: 'today', label: 'Check-ins', href: '/executive/today' },
  { key: 'ai', label: 'Zebrold AI', href: '/executive/ai' },
  { key: 'badges', label: 'Verified badges', href: '/executive/badges' },
  { key: 'equipment', label: 'Equipment orders', href: '/executive/equipment' },
  { key: 'reviews', label: 'Review moderation', href: '/executive/reviews' },
  { key: 'branches', label: 'Branches & practices', href: '/executive/branches' },
  { key: 'leave', label: 'Doctor leave', href: '/executive/leave' },
  { key: 'reports', label: 'Reports', href: '/executive/reports' },
] as const

export type PageKey = (typeof PAGES)[number]['key']
export const isPageKey = (v: unknown): v is PageKey => PAGES.some((p) => p.key === v)
export const PAGE_LABEL = Object.fromEntries(PAGES.map((p) => [p.key, p.label])) as Record<PageKey, string>

/** What the signed-in executive may open. `ready` is false until the migration has run (then everyone is Management). */
export type Access = { ready: boolean; team: Team; pages: PageKey[] }

export const canOpen = (access: Access, page: PageKey | 'staff') => (page === 'staff' ? access.team === 'management' : access.team === 'management' || access.pages.includes(page))

/** The page key for a path under /executive, if it is one a team can be denied. */
export function pageForPath(pathname: string): PageKey | 'staff' | null {
  if (pathname === '/executive/staff' || pathname.startsWith('/executive/staff/')) return 'staff'
  const hit = PAGES.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))
  return hit?.key ?? null
}
