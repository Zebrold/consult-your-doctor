// The partner sign-up pages: centred on a white page under the site header (the login pages have their own split
// layout, app/(auth)/login/AuthShell.tsx).
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden min-h-[calc(100dvh-var(--header-h)-var(--strip-h))] bg-white flex items-center justify-center p-4 sm:p-8 font-sans">
      {children}
    </div>
  )
}
