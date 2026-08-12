import { login } from '@/app/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-500 text-sm mt-2">Log in to your Consult Your Doctor account.</p>
      </div>

      <form action={login} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input 
            type="email" 
            name="email" 
            required
            placeholder="you@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            type="password" 
            name="password" 
            required
            placeholder="••••••••"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full py-2.5 bg-[#E31E24] text-white rounded-md font-semibold hover:bg-red-700 transition-colors mt-4"
        >
          Log In
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link href="/signup" className="text-[#E31E24] font-semibold hover:underline">
          Register here
        </Link>
      </div>
    </div>
  )
}
