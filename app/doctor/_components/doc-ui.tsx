import type { ComponentProps } from 'react'
import { WorkHeader } from '@/components/portal/workspace-ui'

// The doctor workspace's pieces: the shared staff workspace kit (components/portal/workspace-ui.tsx), with the phone
// header branded for the doctor.

export * from '@/components/portal/workspace-ui'
export { WorkBody as DocBody, WorkBackHeader as DocBackHeader } from '@/components/portal/workspace-ui'

/** The phone's blue header for doctor pages: the doctor's photo or initials link to their profile. */
export function DocHeader({ doctor, ...props }: Omit<ComponentProps<typeof WorkHeader>, 'brand'> & { doctor: { name: string; image: string | null } }) {
  return <WorkHeader brand={{ home: '/doctor/dashboard', workspace: 'Doctor workspace', account: { href: '/doctor/profile', label: 'My profile', ...doctor } }} {...props} />
}
