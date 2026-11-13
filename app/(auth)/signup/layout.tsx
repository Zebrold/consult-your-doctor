import { Footer } from '@/components/Footer'

// The join pages (/signup/doctor, /signup/hospital, /signup/diagnostic-centre): a pale page under the blue site
// header, with the site footer. Each page draws its own blue band and form (join-ui.tsx).
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-[#F5F7FB] text-[#0B1B3F] font-(family-name:--font-manrope) pb-14 md:pb-20">{children}</div>
      <Footer />
    </>
  )
}
