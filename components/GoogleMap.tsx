/**
 * An embedded Google Map pinned on an address. The keyless embed brings Google Maps' own controls: the place card,
 * directions, the Map / Satellite layer switch, zoom and full screen.
 */
export function GoogleMap({
  query,
  title,
  zoom = 16,
  className = "",
}: {
  query: string;
  title: string;
  zoom?: number;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#e5e3df] ${className}`}>
      <iframe
        title={title}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=en&output=embed`}
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
