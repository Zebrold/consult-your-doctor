import Link from 'next/link'
import { User, UserSquare, Stethoscope, Building2, ShieldAlert } from 'lucide-react'

export const metadata = {
  title: 'Login - Consult Your Doctor',
}

const roles = [
  {
    id: 'patient',
    title: 'PATIENT',
    icon: User,
    href: '/login/patient',
    color: 'text-emerald-700',
    border: 'border-emerald-100 hover:border-emerald-500',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    hoverBg: 'bg-emerald-50',
    shadow: 'hover:shadow-emerald-200'
  },
  {
    id: 'executive',
    title: 'EXECUTIVE',
    icon: UserSquare,
    href: '/login/executive',
    color: 'text-purple-700',
    border: 'border-purple-100 hover:border-purple-500',
    iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600',
    hoverBg: 'bg-purple-50',
    shadow: 'hover:shadow-purple-200'
  },
  {
    id: 'doctor',
    title: 'DOCTOR',
    icon: Stethoscope,
    href: '/login/doctor',
    color: 'text-blue-700',
    border: 'border-blue-100 hover:border-blue-500',
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    hoverBg: 'bg-blue-50',
    shadow: 'hover:shadow-blue-200'
  },
  {
    id: 'hospital',
    title: 'HOSPITAL',
    icon: Building2,
    href: '/login/hospital',
    color: 'text-orange-700',
    border: 'border-orange-100 hover:border-orange-500',
    iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    hoverBg: 'bg-orange-50',
    shadow: 'hover:shadow-orange-200'
  },
  {
    id: 'admin',
    title: 'ADMIN (SUPER ADMIN)',
    icon: ShieldAlert,
    href: '/login/admin',
    color: 'text-rose-700',
    border: 'border-rose-100 hover:border-rose-500',
    iconBg: 'bg-gradient-to-br from-rose-400 to-rose-600',
    hoverBg: 'bg-rose-50',
    shadow: 'hover:shadow-rose-200'
  }
]

export default function RoleSelectionPage() {
  return (
    <div className="w-full max-w-[1440px] mx-auto py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Welcome to Consult Your Doctor</h1>
        <p className="text-gray-500 text-xl font-medium">Select your role to access your personalized dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 xl:gap-8 px-4">
        {roles.map((role) => {
          const Icon = role.icon
          return (
            <Link
              key={role.id}
              href={role.href}
              className={`
                group relative flex flex-col items-center justify-center 
                h-72 p-8 bg-white rounded-[2rem] border-2 ${role.border} 
                transition-all duration-500 ease-out
                hover:-translate-y-3 hover:shadow-2xl ${role.shadow}
                overflow-hidden
              `}
            >
              {/* Animated background on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 ${role.hoverBg} transition-opacity duration-500`} />

              <div className="relative z-10 flex flex-col items-center gap-8">
                <div className={`
                  w-24 h-24 rounded-3xl flex items-center justify-center text-white 
                  ${role.iconBg} shadow-lg
                  group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500
                `}>
                  <Icon className="w-10 h-10" strokeWidth={2.5} />
                </div>

                <h2 className={`text-2xl font-black ${role.color} text-center tracking-tight uppercase`}>
                  {role.title.split(' (').map((part, i) => (
                    <span key={i} className="block">
                      {i > 0 ? `(${part}` : part}
                    </span>
                  ))}
                </h2>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
