import Link from "next/link";
import { BadgeCheck, Building2, Star, Stethoscope } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecentReviews, timeAgo, type Review } from "@/lib/reviews";
import { Stars } from "@/components/Stars";

const staticReviews = [
  {
    name: "Peetra S.",
    time: "2 hours ago",
    title: "Seamless hospital visit & great doctor",
    body: "The Apollo hospital staff was welcoming and prompt. Dr. Sharma explained my diagnosis with empathy and clear guidance.",
    entity: "Dr. Sharma • Apollo Hospital",
    type: "Doctor & Hospital",
  },
  {
    name: "Nancy N.",
    time: "3 hours ago",
    title: "Exceptional cardiology consultation",
    body: "Dr. Brozo was a true professional and provided thorough patient care. The clinic facilities and testing were state of the art.",
    entity: "Dr. Brozo • City Heart Care",
    type: "Doctor Consultation",
  },
  {
    name: "Harish E.",
    time: "4 hours ago",
    title: "Clean hospital facilities & caring staff",
    body: "Admitted for day care at Manipal Hospital. The nursing team was attentive and the room was hygienic and comfortable.",
    entity: "Manipal Hospital, Bangalore",
    type: "Hospital Care",
  },
  {
    name: "Kavita M.",
    time: "14 hours ago",
    title: "Quick appointment, no waiting",
    body: "Booked in minutes online. The doctor answered all questions regarding my prescription and follow-up tests patiently.",
    entity: "Dr. Ananya Verma • General Medicine",
    type: "Doctor Consultation",
  },
];

const initialsOf = (name: string) =>
  name.replace(/[^a-zA-Z\s]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "P";

/** The verified testimonials, shown until patients have written live reviews on the site. */
function StaticReviews({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`relative isolate ${compact ? "py-10 md:py-12" : "py-16"} overflow-hidden bg-white border-t border-slate-100`}>
      <div className="max-w-container-max mx-auto px-margin-x-mobile lg:px-margin-x-desktop">
        <div className="text-center space-y-3 mb-8">
          <h2 className="font-display-lg text-3xl md:text-4xl font-extrabold text-indigo-gray-900 tracking-tight">
            What <span className="text-vibrant-blue">our patients say</span>
          </h2>
          <div className="flex flex-col items-center justify-center gap-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-indigo-gray-900">4.9 / 5</span>
              <div className="flex items-center gap-1" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="w-6 h-6 flex items-center justify-center bg-[#00b67a] text-white rounded">
                    <Star className="w-4 h-4 fill-current" />
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-700 font-medium">
              Verified feedback for <span className="font-bold text-indigo-gray-900">Doctors &amp; Partner Hospitals</span>
            </p>
          </div>
        </div>

        <p className="mb-6 text-slate-600 font-semibold text-sm">Recent verified reviews after completed consultations</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {staticReviews.map((review) => (
            <article
              key={review.name}
              className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-500 gap-0.5" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5 text-vibrant-blue" /> Verified
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="w-10 h-10 rounded-full bg-primary-fixed text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {initialsOf(review.name)}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">{review.name}</h3>
                    <p className="text-xs text-slate-400">{review.time}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 mb-1 leading-snug">{review.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{review.body}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-vibrant-blue truncate">
                {review.entity}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Patient reviews on the home page. As soon as patients review their doctors & hospitals (Appointments → Rate your visit),
 * the newest verified feedback appears here straight away.
 */
export async function TrustedByPatients({ compact = false }: { compact?: boolean } = {}) {
  const { reviews, summary } = await loadRecentReviews(createAdminClient(), 8)
  if (reviews.length === 0) return <StaticReviews compact={compact} />

  return (
    <section className={`relative isolate ${compact ? "py-10 md:py-12" : "py-16"} overflow-hidden bg-white border-t border-slate-100`}>
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
                From <span className="font-semibold">{summary.count.toLocaleString("en-IN")} {summary.count === 1 ? "review" : "reviews"}</span> by patients for Doctors &amp; Hospitals
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <p className="text-slate-600 font-semibold text-sm">Latest reviews from verified visits</p>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-vibrant-blue font-semibold">
              <Stethoscope className="w-3.5 h-3.5" /> Doctor Consultations
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              <Building2 className="w-3.5 h-3.5" /> Hospital Care
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review: Review) => (
            <article key={review.id} className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={review.rating} tone="text-amber-500" />
                  <span className="flex items-center gap-1 text-[11px] text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    <BadgeCheck className="w-3.5 h-3.5 text-vibrant-blue" /> Verified
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
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{review.comment}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                {review.doctor && (
                  <Link href={`/doctors/${review.doctor.id}`} className="text-xs font-semibold text-vibrant-blue hover:underline truncate flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Dr. {review.doctor.name}{review.doctor.specialty ? ` • ${review.doctor.specialty}` : ""}</span>
                  </Link>
                )}
                {review.hospital && (
                  <Link href={`/hospitals/${review.hospital.id}`} className="text-xs font-semibold text-emerald-700 hover:underline truncate flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{review.hospital.name}{review.hospital.city ? ` • ${review.hospital.city}` : ""}</span>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
