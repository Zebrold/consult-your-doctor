import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full text-center">
        <p className="text-sm font-semibold text-vibrant-blue">404</p>
        <h1 className="mt-2 font-headline-lg text-2xl md:text-3xl font-bold tracking-tight text-indigo-gray-900">
          We couldn’t find that page
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          The link may be out of date, or the page may have moved. You can search for a doctor or go back to the home page.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-vibrant-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary transition-colors"
          >
            Go to home page
          </Link>
          <Link
            href="/doctors"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Find a doctor
          </Link>
        </div>
      </div>
    </div>
  )
}
