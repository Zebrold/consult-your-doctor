import { Header } from '@/components/Header'
import { Mail, MapPin, Phone } from 'lucide-react'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Consult Your Doctor. We are here to help you with your healthcare needs.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            Get in <span className="text-[#E31E24]">Touch</span>
          </h1>
          <p className="text-xl text-gray-600">
            Our dedicated support team is available 24/7 to assist you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Information */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6 text-[#E31E24]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Phone Support</h3>
                <p className="text-gray-500 mt-1">Available 24/7 for urgent queries</p>
                <p className="text-lg font-semibold text-[#E31E24] mt-2">+91 1800-123-4567</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-[#E31E24]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Email Us</h3>
                <p className="text-gray-500 mt-1">For general inquiries and partnerships</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">support@consultdoctor.com</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-[#E31E24]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Headquarters</h3>
                <p className="text-gray-500 mt-1">Visit us at our corporate office</p>
                <p className="text-md font-medium text-gray-900 mt-2">
                  123 Healthcare Avenue, Cyber City,<br />
                  Gurugram, Haryana 122002
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            <form className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Message</label>
                <textarea 
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] bg-gray-50 focus:bg-white text-gray-900 transition-all resize-none"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <button 
                type="button" 
                className="w-full py-3 bg-[#E31E24] text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
