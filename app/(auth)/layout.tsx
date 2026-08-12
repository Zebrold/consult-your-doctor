import { Header } from '@/components/Header'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        {children}
      </main>
    </div>
  )
}
