import { logout } from '@/app/actions/auth'

export default function PatientDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Patient Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome! This is the protected dashboard for patients.</p>
        <form action={logout}>
          <button type="submit" className="px-6 py-2 bg-[#E31E24] text-white rounded font-medium hover:bg-red-700 transition-colors">
            Logout
          </button>
        </form>
      </div>
    </div>
  )
}
