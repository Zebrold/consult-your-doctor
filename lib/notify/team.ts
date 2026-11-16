import { siteUrl } from '@/lib/site-url'
import { sendEmail, teamInbox } from './email'
import { later } from './later'

// "Something is waiting for you" emails to the Consult your Doctor operations team (SUPPORT_EMAIL, else the company
// address): new applications and enquiries, paid badges and equipment orders, withdrawals and refunds to pay. Each one
// links to the executive page where the team acts on it. They carry only what the team needs to find the item.

export type TeamAlert = {
  subject: string
  heading: string
  lines: string[]
  facts?: [string, string][]
  /** The executive page to open, e.g. "/executive/payments". */
  page: string
  button: string
}

/** Sends the alert now. Never throws. */
export async function alertTeam(_label: string, a: TeamAlert) {
  return sendEmail({
    to: teamInbox(),
    subject: `[Team] ${a.subject}`,
    heading: a.heading,
    paragraphs: a.lines,
    facts: a.facts?.filter(([, v]) => !!v),
    button: { text: a.button, url: `${siteUrl()}${a.page}` },
  }).catch(() => false)
}

/** Sends the alert after the response, so the person who clicked never waits for it. */
export function alertTeamLater(label: string, a: TeamAlert) {
  later(`team ${label}`, () => alertTeam(label, a))
}
