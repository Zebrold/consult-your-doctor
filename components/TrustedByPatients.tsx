import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecentReviews, timeAgo } from "@/lib/reviews";
import { Stars } from "@/components/Stars";

const reviews = [
  {
    name: "Peetra",
    time: "2 hours ago",
    title: "Fast action, fast solution, enjoy holiday",
    body: "This was a very efficient and effective way of seeing a doctor for a quick solution while on holiday.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCdFKBXGefFUHjLMZwNSqfsZzmZ0DdVe1A2fI3ch6fq85b83_7RXuwbi2Pe5bQsQJDEO9P6tkFnHsqYQ0NDRQ8hOuGRpeiRqtXE5TavgyquVD24NPsk10sQHC0zQx9uCWNhu3kNkiOBBV3kV3Y6HQ9kHEeM2SbIYQfZ221oWCXH9bNTnZgQovbEqteIc_0vqUfj7otSh95BPxXvcOUWk2wlSfVH3hb9BztRqJKIDuFLfjSTpsL9NpFMCA",
  },
  {
    name: "Nancy Niehous",
    time: "3 hours ago",
    title: "Dr. Brozo",
    body: "Dr. Brozo was a true professional and provided excellent patient care in all areas!",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDIndlaRjS-_B3AmM2cso5QNtJbS0dSJloAWMld0qwOx80BOg04jhGlSp0ogm5dpFEk5cP_UZT1Pj8L9RB3OYvSQrPJJ6kxQaKhN-MjFZv879nOL6TiC_LSyM-MSqH9v_KPZtFJ1xujKJogC34A-QMFzod-RlIbCzLb_uQNbi6o9hBgtBWaoMPxxZbezX1cjF4X0wvmCPY8pjdW560GIdxHgiMaHkmkoMc6hrAlDLLRBt-yuJOwWHZbMQ",
  },
  {
    name: "H.E.",
    time: "4 hours ago",
    title: "Great experience",
    body: "Great experience. Prompt video appointment for a repeat prescription while abroad on holiday. Would recommend and use again.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCJ90iwGAZ-HRbiEDijEpUWj26ZTG-ssRGQ3BS5Rb9NHC0h9mg4ECdUOxZfjFnZhrl7gzRPV0BxZq3Rv9Onm0pE70N6d6BFr94J6idK3WZcTuG6mgoIcV-PBkk9wHaiH2JoR-1vXJebeh-ijH6P5vaZ--INva16aNU_u0nGE0ES9RyoK9lMMXCkrw_pFrLGAkiWAvbVpI2Wesv6b-I1C_YX3wrs7sCFtbL1YS2AoYzpR5hXu_nxj93oVA",
  },
  {
    name: "Kim",
    time: "14 hours ago",
    title: "An excellent service",
    body: "My video consultation was easy to organise, with an appointment booked within minutes. The issue was dealt with quickly and the doctor was very helpful.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBaoz5PcCyIHeW8zmXvv9Q5M--ryNraocObeVkgmpAVhjV4U-p72FU1X84EUXYoCcMoWOkZvl4rlyhqf2mdHN3sK0iWk9wIlzzigqvICNtm3OyqdSyEwXgxQY_-Jf3WW_P7srSB9kXYfnP-gW1-9EqsPJiO866TV61RPUvYVCRWkC1wkH8-EeG5kZ8Jhjc9ugiEo0piEasTIjMZqIgB8bap3ajMf0LM2MNviXplXhhE5G0yO0T1qrJfqw",
  },
];

/** The original testimonials, shown until patients have written reviews on the site. */
function StaticReviews() {
  return (
    <section className="relative isolate py-16 overflow-hidden bg-white border-t border-slate-100">
      <div aria-hidden className="absolute -left-20 top-1/4 w-[420px] h-[420px] rounded-full bg-blue-200/40 blur-3xl pointer-events-none -z-10" />
      <div aria-hidden className="absolute -right-20 top-1/3 w-[450px] h-[450px] rounded-full bg-blue-200/50 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
        <div className="text-center space-y-3 mb-8">
          <h2 className="font-display-lg text-3xl md:text-4xl font-extrabold text-indigo-gray-900 tracking-tight">
            Trusted by <span className="text-vibrant-blue">patients in 40+ countries</span>
          </h2>
          <div className="flex flex-col items-center justify-center gap-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-indigo-gray-900">Excellent</span>
              <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="w-6 h-6 flex items-center justify-center bg-[#00b67a] text-white">
                    <Star className="w-4 h-4 fill-current" />
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-700 font-medium">
              Rated <span className="font-bold">4.9</span> / 5 based on{" "}
              <span className="underline font-semibold">5,411 verified reviews</span> on{" "}
              <span className="font-bold text-indigo-gray-900">
                <span className="text-[#00b67a]">★</span>Trustpilot
              </span>
            </p>
          </div>
        </div>

        <p className="mb-6 text-slate-600 font-semibold text-sm">Showing verified real-time patient experiences</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex text-vibrant-blue gap-0.5" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                  <BadgeCheck className="w-4 h-4 text-vibrant-blue" /> Verified Patient
                </span>
              </div>
              <div className="flex items-center gap-3">
                <img alt={review.name} className="w-10 h-10 rounded-full object-cover" src={review.image} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">{review.name}</h3>
                  <p className="text-xs text-slate-400">{review.time}</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1 leading-snug">{review.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{review.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Patient reviews on the home page. As soon as patients review their doctors (Appointments → Rate your visit), the
 * newest ones appear here with the doctor they saw; until then the original testimonials are shown.
 */
export async function TrustedByPatients() {
  const { reviews, summary } = await loadRecentReviews(createAdminClient(), 8)
  if (reviews.length === 0) return <StaticReviews />

  return (
    <section className="relative isolate py-16 overflow-hidden bg-white border-t border-slate-100">
      <div aria-hidden className="absolute -left-20 top-1/4 w-[420px] h-[420px] rounded-full bg-blue-200/40 blur-3xl pointer-events-none -z-10" />
      <div aria-hidden className="absolute -right-20 top-1/3 w-[450px] h-[450px] rounded-full bg-blue-200/50 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
        <div className="text-center space-y-3 mb-8">
          <h2 className="font-display-lg text-3xl md:text-4xl font-extrabold text-indigo-gray-900 tracking-tight">
            What <span className="text-vibrant-blue">our patients say</span>
          </h2>
          {summary.average != null && (
            <div className="flex flex-col items-center justify-center gap-2 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-indigo-gray-900">{summary.average.toFixed(1)} / 5</span>
                <Stars value={summary.average} className="w-6 h-6" />
              </div>
              <p className="text-xs md:text-sm text-slate-700 font-medium">
                From <span className="font-semibold">{summary.count.toLocaleString("en-IN")} {summary.count === 1 ? "review" : "reviews"}</span> by patients after their consultations
              </p>
            </div>
          )}
        </div>

        <p className="mb-6 text-slate-600 font-semibold text-sm">Latest reviews from verified visits</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review) => (
            <article key={review.id} className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <Stars value={review.rating} tone="text-vibrant-blue" />
                <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                  <BadgeCheck className="w-4 h-4 text-vibrant-blue" /> Verified visit
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-primary-fixed text-primary font-bold flex items-center justify-center text-sm shrink-0">
                  {review.patientName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">{review.patientName}</h3>
                  <p className="text-xs text-slate-400">{timeAgo(review.createdAt)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-5 flex-1">{review.comment}</p>
              {review.doctor && (
                <Link href={`/doctors/${review.doctor.id}`} className="text-xs font-semibold text-vibrant-blue hover:underline truncate">
                  Visited {review.doctor.name}
                  {review.doctor.specialty ? ` • ${review.doctor.specialty}` : ""}
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
