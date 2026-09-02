import Link from 'next/link'
import { User, UserSquare, Stethoscope, Building2, ShieldCheck, ChevronRight, Activity } from 'lucide-react'

export const metadata = {
  title: 'Login - Consult Your Doctor',
}

const roles = [
  {
    id: 'patient',
    title: 'Patient',
    desc: 'Book appointments and view your medical records.',
    icon: User,
    href: '/login/patient',
  },
  {
    id: 'doctor',
    title: 'Doctor',
    desc: 'Manage your schedule, consultations, and patients.',
    icon: Stethoscope,
    href: '/login/doctor',
  },
  {
    id: 'hospital',
    title: 'Hospital',
    desc: 'Manage your facility, doctors, and departments.',
    icon: Building2,
    href: '/login/hospital',
  },
  {
    id: 'executive',
    title: 'Executive',
    desc: 'Assist patients with bookings and manage logistics.',
    icon: UserSquare,
    href: '/login/executive',
  },
  {
    id: 'diagnostic',
    title: 'Diagnostic Center',
    desc: 'Manage your center, tests, and appointments.',
    icon: Activity,
    href: '/login/diagnostic',
  },
  {
    id: 'admin',
    title: 'Super Admin',
    desc: 'Overall platform administration and oversight.',
    icon: ShieldCheck,
    href: '/login/admin',
  }
]

export default function RoleSelectionPage() {
  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Welcome to Consult Your Doctor
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Please select your role below to securely access your personalized dashboard and tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const Icon = role.icon
          return (
            <Link
              key={role.id}
              href={role.href}
              className="group flex flex-col p-6 bg-white rounded-2xl border border-gray-200 hover:border-[#E31E24] hover:shadow-xl transition-all duration-300 ease-in-out relative overflow-hidden"
            >
              {/* Subtle accent line on top */}
              <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-[#E31E24] transition-colors duration-300" />

              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-red-50 group-hover:text-[#E31E24] flex items-center justify-center transition-colors duration-300">
                  <Icon className="w-7 h-7" strokeWidth={2} />
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-300 group-hover:bg-[#E31E24] group-hover:text-white flex items-center justify-center transition-colors duration-300">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#E31E24] transition-colors duration-300">
                  {role.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {role.desc}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-400">
          Need help? <a href="/contact" className="text-[#E31E24] font-medium hover:underline">Contact Support</a>
        </p>
      </div>
    </div>
  )
}
