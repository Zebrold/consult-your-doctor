import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Doctor Portal',
}
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, Users, ClipboardList, LogOut, Stethoscope, Bell } from 'lucide-react'
import { SidebarLink } from '@/components/SidebarLink'
import { MobileDashboardMenu } from '@/components/MobileDashboardMenu'

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/doctor')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role !== 'doctor') {
    redirect('/')
  }

  const navLinks = (
    <>
      <SidebarLink
        href="/doctor/dashboard"
        icon={<CalendarDays className="w-5 h-5" />}
        label="Today's Appointments"
        activeClassName="bg-blue-50 text-blue-700 font-bold"
        exactMatch={true}
      />
      <SidebarLink
        href="/doctor/dashboard/schedules"
        icon={<CalendarDays className="w-5 h-5" />}
        label="My Schedule"
        activeClassName="bg-blue-50 text-blue-700 font-bold"
      />
      <SidebarLink
        href="/doctor/patients"
        icon={<Users className="w-5 h-5" />}
        label="My Patients"
        activeClassName="bg-blue-50 text-blue-700 font-bold"
      />
      <SidebarLink
        href="/doctor/records"
        icon={<ClipboardList className="w-5 h-5" />}
        label="Medical Records"
        activeClassName="bg-blue-50 text-blue-700 font-bold"
      />
    </>
  )

  const logoutForm = (
    <form action="/auth/signout" method="post">
      <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors cursor-pointer">
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </form>
  )

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {children}
    </div>
  )
}
