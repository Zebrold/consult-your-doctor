// The map tiles every patient map uses. One host rather than Leaflet's mt0–mt3 sharding: over HTTP/2 one connection
// carries all the tiles, and pages can open it early with preconnect(TILE_ORIGIN) before the map's script loads.
export const TILE_ORIGIN = 'https://mt0.google.com'
export const TILE_URL = `${TILE_ORIGIN}/vt/lyrs=m&x={x}&y={y}&z={z}`
