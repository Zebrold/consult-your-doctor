import Link from 'next/link'
import { UserSquare, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Executive Login - Consult Your Doctor',
}

export default function ExecutiveLoginPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </Link>
      
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
          <UserSquare className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to support patient journeys</p>
      </div>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Executive ID / Email</label>
          <input type="email" placeholder="exec@consultyourdoctor.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <input type="password" placeholder="••••••••" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
        </div>
        <button type="button" className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors mt-2">
          Sign In
        </button>
      </form>
    </div>
  )
}
