import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication',
}

// Each part brings its own frame: the login pages fill the screen (login/AuthShell.tsx), and the sign-up pages sit
// under the site header (signup/layout.tsx), which comes from the root layout (ConditionalLayout).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
