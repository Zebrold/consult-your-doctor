import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/patient/",
        "/doctor/",
        "/hospital/",
        "/executive/",
        "/diagnostic-center/",
        "/diagnostic/", // Based on the middleware prefix
      ],
    },
    sitemap: "https://consultyourdoctor.de/sitemap.xml",
  };
}
