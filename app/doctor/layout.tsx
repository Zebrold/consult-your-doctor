import { redirect } from 'next/navigation'
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="flex flex-col items-start px-6 py-5 border-b border-gray-200">
          <Link href="/">
            <Image src="/logo.png" alt="Consult your Doctor" width={190} height={40} className="h-12 w-auto object-contain mb-3" priority />
          </Link>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#E31E24]" />
            <span className="text-lg font-black text-gray-900 tracking-tight">Doctor<span className="text-[#E31E24]">Portal</span></span>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          {navLinks}
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
              {profile.full_name?.replace('Dr. ', '')?.charAt(0) || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-gray-500 truncate">Physician</p>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="w-full mt-2 flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile/Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex md:hidden items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#E31E24]" />
            <span className="font-black text-gray-900">Doctor</span>
          </div>
          <div className="flex items-center">
            <MobileDashboardMenu footer={logoutForm}>{navLinks}</MobileDashboardMenu>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
