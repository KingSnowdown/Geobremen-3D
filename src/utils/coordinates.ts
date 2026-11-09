import proj4 from 'proj4';

// Define EPSG:25832 (ETRS89 / UTM zone 32N)
proj4.defs(
  'EPSG:25832',
  '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

// Define EPSG:4326 (WGS84 Lon/Lat)
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

/**
 * Cleans string coordinates with commas and strips German 32 zone prefix if present.
 * Example: "32,491,899.94" -> 491899.94
 */
export function parseGermanUTMCoordinate(
  coordStr: string | number,
  isEasting = false
): number {
  if (typeof coordStr === 'number') {
    let val = coordStr;
    if (isEasting && val > 30000000) {
      val -= 32000000;
    }
    return val;
  }

  if (!coordStr) return 0;

  // Remove quotes, spaces, and thousand-separator commas
  const cleaned = String(coordStr)
    .replace(/["']/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '');

  let val = parseFloat(cleaned);
  if (isNaN(val)) return 0;

  // If Easting has UTM Zone 32 prefix (e.g. 32491899.94)
  if (isEasting && val > 30000000) {
    val -= 32000000;
  }

  return val;
}

/**
 * Transforms EPSG:25832 UTM Zone 32N coordinates to WGS84 [lon, lat]
 */
export function utm32ToWgs84(easting: number, northing: number): [number, number] {
  try {
    const [lon, lat] = proj4('EPSG:25832', 'EPSG:4326', [easting, northing]);
    return [lon, lat];
  } catch (err) {
    console.warn('Coordinate transformation failed:', err);
    // Fallback approximate for Bremen
    return [8.885, 53.085];
  }
}

/**
 * Transforms WGS84 [lon, lat] to EPSG:25832 [easting, northing]
 */
export function wgs84ToUtm32(lon: number, lat: number): [number, number] {
  try {
    const [easting, northing] = proj4('EPSG:4326', 'EPSG:25832', [lon, lat]);
    return [easting, northing];
  } catch (err) {
    console.warn('Coordinate transformation failed:', err);
    return [491899, 5882016];
  }
}
