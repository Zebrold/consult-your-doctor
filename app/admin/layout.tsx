import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, Users, LogOut, Building2, Bell, ShieldCheck } from 'lucide-react'
import { SidebarLink } from '@/components/SidebarLink'
import { MobileDashboardMenu } from '@/components/MobileDashboardMenu'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/admin')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    redirect('/')
  }

  const navLinks = (
    <>
      <SidebarLink
        href="/admin/dashboard"
        icon={<LayoutDashboard className="w-5 h-5" />}
        label="Global Overview"
        activeClassName="bg-red-50 text-[#E31E24] font-bold"
        inactiveClassName="text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
        exactMatch={true}
      />
      <SidebarLink
        href="/admin/hospitals"
        icon={<Building2 className="w-5 h-5" />}
        label="Manage Hospitals"
        activeClassName="bg-red-50 text-[#E31E24] font-bold"
        inactiveClassName="text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
      />
      <SidebarLink
        href="/admin/staff"
        icon={<Users className="w-5 h-5" />}
        label="Staff Management"
        activeClassName="bg-red-50 text-[#E31E24] font-bold"
        inactiveClassName="text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
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
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex text-gray-600">
        <div className="flex flex-col items-start px-6 py-5 border-b border-gray-100">
          <Link href="/">
            <Image src="/logo.png" alt="Consult your Doctor" width={190} height={40} className="h-12 w-auto object-contain mb-3" priority />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#E31E24]" />
            <span className="text-lg font-black text-gray-900 tracking-tight">Super<span className="text-[#E31E24]">Admin</span></span>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          {navLinks}
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center font-bold text-[#E31E24] shrink-0">
              {profile.full_name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{profile.full_name || 'System Admin'}</p>
              <p className="text-xs text-gray-500 truncate">Super Admin</p>
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
            <ShieldCheck className="w-6 h-6 text-[#E31E24]" />
            <span className="font-black text-gray-900">Admin</span>
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
