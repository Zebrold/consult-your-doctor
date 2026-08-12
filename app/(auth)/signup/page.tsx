import { signUp } from '@/app/actions/auth'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
        <p className="text-gray-500 text-sm mt-2">Join Consult Your Doctor today.</p>
      </div>

      <form action={signUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input 
            type="text" 
            name="fullName" 
            required
            placeholder="John Doe"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
          />
        </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input 
            type="tel" 
            name="phoneNumber" 
            placeholder="+1 234 567 8900"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">I am a...</label>
          <select 
            name="role" 
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none bg-white transition-all"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="executive">Executive</option>
            <option value="hospital_admin">Hospital Admin</option>
          </select>
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
          Register
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-[#E31E24] font-semibold hover:underline">
          Log in here
        </Link>
      </div>
    </div>
  )
}
