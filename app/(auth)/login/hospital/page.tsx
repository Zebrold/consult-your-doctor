import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Hospital Login - Consult Your Doctor',
}

export default function HospitalLoginPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </Link>
      
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Hospital Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to manage your hospital operations</p>
      </div>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Email</label>
          <input type="email" placeholder="admin@hospital.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <input type="password" placeholder="••••••••" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
        </div>
        <button type="button" className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors mt-2">
          Sign In
        </button>
      </form>
    </div>
  )
}
