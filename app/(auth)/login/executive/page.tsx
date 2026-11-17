import type { Metadata } from 'next'
import { AuthCorner } from '../AuthShell'
import { FooterLine, StaffLoginCard } from '../StaffLoginCard'

export const metadata: Metadata = { title: 'Executive Login' }

// Executive accounts are created by the Consult Your Doctor team.
export default function ExecutiveLoginPage() {
  return (
    <StaffLoginCard
      role="executive"
      art="executive"
      title="Team login"
      subtitle="For Consult your Doctor team members only"
      backHref="/"
      corner={<AuthCorner lead="Need access?" label="Ask your manager" />}
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
