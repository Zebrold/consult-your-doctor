import { Header } from '@/components/Header'
import { Building2, Heart, Users, Target } from 'lucide-react'

export const metadata = {
  title: 'About Us - Consult Your Doctor',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            About <span className="text-[#E31E24]">Consult Your Doctor</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            We are India's premier healthcare concierge platform, dedicated to making quality healthcare accessible, transparent, and seamless for everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mt-20 max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
              <Target className="w-6 h-6 text-[#E31E24]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              To bridge the gap between patients and top-tier healthcare providers through technology and personalized executive support. We believe that finding the right doctor shouldn't be a struggle.
            </p>
          </div>
          <div className="space-y-6">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
            <p className="text-gray-600 leading-relaxed">
              To be the most trusted healthcare companion for every family, ensuring that no one has to navigate complex medical systems alone.
            </p>
          </div>
        </div>

        <div className="mt-24 max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Us?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <Building2 className="w-8 h-8 text-[#E31E24] mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">NABH Hospitals</h3>
              <p className="text-sm text-gray-500">Partnered with only the highest accredited medical facilities.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <Users className="w-8 h-8 text-[#E31E24] mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Verified Specialists</h3>
              <p className="text-sm text-gray-500">Access to a curated network of top-rated doctors.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <Heart className="w-8 h-8 text-[#E31E24] mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-500">Dedicated executives to guide you every step of the way.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
