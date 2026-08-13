'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { superAdminLogout } from '@/app/actions/admin'
import { 
  LayoutDashboard, 
  Building2, 
  Stethoscope, 
  Users, 
  LogOut,
  ShieldCheck
} from 'lucide-react'

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Hospitals', href: '/admin/dashboard/hospitals', icon: Building2 },
    { name: 'Doctors', href: '/admin/dashboard/doctors', icon: Stethoscope },
    { name: 'Patients', href: '/admin/dashboard/patients', icon: Users },
  ]

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <ShieldCheck className="w-6 h-6 text-[#E31E24] mr-2" />
          <span className="text-lg font-bold text-gray-900 tracking-tight">Super Admin</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-red-50 text-[#E31E24]' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#E31E24]' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <form action={superAdminLogout}>
            <button 
              type="submit" 
              className="w-full flex items-center px-4 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 mr-3 text-gray-400" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>

    </div>
  )
}
