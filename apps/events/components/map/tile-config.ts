/**
 * Basemap for the event map.
 *
 * Defaults to Esri's keyless dark-grey canvas (base + label layers). Set
 * NEXT_PUBLIC_MAP_TILE_URL (plus _ATTRIBUTION, _SUBDOMAINS, _MAX_NATIVE_ZOOM) to use
 * another raster style, e.g. CARTO dark_all with an API key or a Mapbox style —
 * CARTO's public basemaps now return "API key required" watermark tiles.
 */
export interface TileLayerConfig {
  url: string;
  attribution?: string;
  subdomains?: string;
  maxNativeZoom: number;
}

const ESRI_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community';

const custom = process.env.NEXT_PUBLIC_MAP_TILE_URL;

export const BASEMAP: { base: TileLayerConfig; labels?: TileLayerConfig } = custom
  ? {
      base: {
        url: custom,
        attribution:
          process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: process.env.NEXT_PUBLIC_MAP_TILE_SUBDOMAINS || "abc",
        maxNativeZoom: Number(process.env.NEXT_PUBLIC_MAP_TILE_MAX_NATIVE_ZOOM) || 19,
      },
    }
  : {
      base: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: ESRI_ATTRIBUTION,
        maxNativeZoom: 16,
      },
      labels: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        maxNativeZoom: 16,
      },
    };
