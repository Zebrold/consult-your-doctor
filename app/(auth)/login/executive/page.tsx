import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Executive Login' }

// Executive accounts are created by the Consult Your Doctor team.
export default function ExecutiveLoginPage() {
  return (
    <StaffLoginCard
      role="executive"
      panel={{
        title: 'Grow the network, in one place',
        lead: 'The executive portal for the Consult your Doctor team.',
        points: [
          { title: 'Partner applications', text: 'Review doctor, hospital and diagnostic centre applications.' },
          { title: 'Approve and add', text: 'Approving a hospital or lab creates its listing and staff login.' },
          { title: 'Walk-in bookings', text: 'Book patients at the counter, paid in cash at the desk.' },
          { title: 'Hospital wallets', text: 'Pay or reject withdrawals and record what a hospital pays in.' },
          { title: 'Today and revenue', text: "The day's bookings and revenue across the network." },
        ],
        art: 'executive',
      }}
      corner={<AuthCorner lead="Need access?" label="Ask your manager" />}
      title="Sign in to the executive portal"
      description="For Consult your Doctor team members only."
      idLabel="Staff ID or work email"
      idHelp="Use the Staff ID on your account, or your company email."
      footer={
        <FooterLine lead="Trouble signing in?" href="/contact">
          Contact the admin team
        </FooterLine>
      }
    />
  )
}
