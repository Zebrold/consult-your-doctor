import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUBLIC_DOCS, docHref } from '@/lib/legal-docs';
import { SPECIALITIES } from '@/components/home/specialities';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://consultyourdoctor.de';

  const adminSupabase = createAdminClient();

  // Fetch all doctor IDs
  const { data: doctors } = await adminSupabase
    .from('doctors')
    .select('id');

  // Fetch all hospital IDs
  const { data: hospitals } = await adminSupabase
    .from('hospitals')
    .select('id');

  const doctorUrls: MetadataRoute.Sitemap = (doctors || []).map((doc) => ({
    url: `${baseUrl}/doctors/${doc.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const hospitalUrls: MetadataRoute.Sitemap = (hospitals || []).map((hosp) => ({
    url: `${baseUrl}/hospitals/${hosp.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    ...['/how-it-works', '/corporate', '/what-we-treat', '/online-doctor', '/prices'].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    ...['/terms-of-use', '/privacy-policy', '/legal', ...PUBLIC_DOCS.map(docHref)].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
    ...['/signup/doctor', '/signup/hospital', '/signup/diagnostic-centre'].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/doctors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hospitals`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/diagnostics`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Fetch all hospital cities for programmatic local SEO pages
  const { data: hospitalCitiesData } = await adminSupabase
    .from('hospitals')
    .select('city');
    
  const uniqueCities = Array.from(
    new Set((hospitalCitiesData || []).map(h => h.city).filter(Boolean))
  );

  const cityDoctorUrls: MetadataRoute.Sitemap = uniqueCities.map((city) => ({
    url: `${baseUrl}/doctors/in/${encodeURIComponent(city.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const cityHospitalUrls: MetadataRoute.Sitemap = uniqueCities.map((city) => ({
    url: `${baseUrl}/hospitals/in/${encodeURIComponent(city.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const specialityUrls: MetadataRoute.Sitemap = SPECIALITIES.map((s) => ({
    url: `${baseUrl}/specialities/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    ...staticUrls,
    ...doctorUrls,
    ...hospitalUrls,
    ...cityDoctorUrls,
    ...cityHospitalUrls,
    ...specialityUrls
  ];
}
