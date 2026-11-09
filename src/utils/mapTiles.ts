import * as THREE from 'three';
import { utm32ToWgs84, wgs84ToUtm32 } from './coordinates';

export type MapTileStyle = 'osm' | 'esri-streets' | 'esri-topo' | 'esri-imagery';

export interface MapBounds {
  minEasting: number;
  maxEasting: number;
  minNorthing: number;
  maxNorthing: number;
  widthMeters: number;
  heightMeters: number;
  centerEasting: number;
  centerNorthing: number;
}

/**
 * Slippy tile math: Lon/Lat to Tile X/Y at Zoom
 */
function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * High-resolution and reliable tile servers supporting CORS and high contrast
 */
function getTileUrl(style: MapTileStyle, z: number, x: number, y: number): string {
  switch (style) {
    case 'esri-streets':
      // Esri World Street Map (High resolution streets, German labels, building outlines)
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
    case 'esri-topo':
      // Esri World Topo Map (Topographic map with terrain contours and relief)
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`;
    case 'esri-imagery':
      // Esri World Imagery (High-res aerial satellite photography of Bremen - unchanged as requested)
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    case 'osm':
    default:
      // Official OpenStreetMap tiles via CORS-open OSM France & Humanitarian clusters (No API Key Required!)
      const sub = ['a', 'b', 'c'][(x + y) % 3];
      return `https://${sub}.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`;
  }
}

/**
 * Creates high-resolution stitched map canvas texture for the ground plane
 */
export async function generateBremenMapTexture(
  centerEasting: number,
  centerNorthing: number,
  extentWidthMeters: number,
  extentHeightMeters: number,
  style: MapTileStyle = 'esri-streets',
  onUpdate?: (texture: THREE.CanvasTexture, bounds: MapBounds) => void
): Promise<{ texture: THREE.CanvasTexture; bounds: MapBounds }> {
  // Add margin around borehole extent (at least 600m each side for context)
  const minE = centerEasting - extentWidthMeters * 0.5;
  const maxE = centerEasting + extentWidthMeters * 0.5;
  const minN = centerNorthing - extentHeightMeters * 0.5;
  const maxN = centerNorthing + extentHeightMeters * 0.5;

  const [minLon, minLat] = utm32ToWgs84(minE, minN);
  const [maxLon, maxLat] = utm32ToWgs84(maxE, maxN);

  // High-resolution zoom calculation:
  // Zoom 17 in Bremen (~53°N) provides ~0.71 m/px, rendering street names and parcels crystal-clear
  const maxExtent = Math.max(extentWidthMeters, extentHeightMeters);
  let zoom = 17;
  if (maxExtent > 5000) {
    zoom = 15;
  } else if (maxExtent > 2600) {
    zoom = 16;
  }

  const tileMinX = Math.floor(lon2tile(minLon, zoom));
  const tileMaxX = Math.floor(lon2tile(maxLon, zoom));
  const tileMinY = Math.floor(lat2tile(maxLat, zoom));
  const tileMaxY = Math.floor(lat2tile(minLat, zoom));

  const tilesX = Math.max(1, tileMaxX - tileMinX + 1);
  const tilesY = Math.max(1, tileMaxY - tileMinY + 1);

  // Actual bounds in WGS84 of the tile grid
  const actualWgsMinLon = tile2lon(tileMinX, zoom);
  const actualWgsMaxLon = tile2lon(tileMaxX + 1, zoom);
  const actualWgsMaxLat = tile2lat(tileMinY, zoom);
  const actualWgsMinLat = tile2lat(tileMaxY + 1, zoom);

  const [actMinE, actMinN] = wgs84ToUtm32(actualWgsMinLon, actualWgsMinLat);
  const [actMaxE, actMaxN] = wgs84ToUtm32(actualWgsMaxLon, actualWgsMaxLat);

  const bounds: MapBounds = {
    minEasting: actMinE,
    maxEasting: actMaxE,
    minNorthing: actMinN,
    maxNorthing: actMaxN,
    widthMeters: Math.abs(actMaxE - actMinE),
    heightMeters: Math.abs(actMaxN - actMinN),
    centerEasting: (actMinE + actMaxE) / 2,
    centerNorthing: (actMinN + actMaxN) / 2,
  };

  const canvas = document.createElement('canvas');
  const tileSize = 256;
  canvas.width = tilesX * tileSize;
  canvas.height = tilesY * tileSize;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Initial background with grid - use pure white for vector/street/topo maps to prevent gray fringing
  ctx.fillStyle = style === 'esri-imagery' ? '#0f172a' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = style === 'esri-imagery' ? '#334155' : '#f1f5f9';
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Initial loading text
  ctx.fillStyle = style === 'esri-imagery' ? '#94a3b8' : '#64748b';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Bremen Grundkarte wird hochauflösend geladen...', 30, 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  // 2. Fetch and draw tiles
  const tilePromises: Promise<void>[] = [];

  // Filter configuration: Esri Street & Topo tiles are naturally very pale pastel/low-saturation.
  // We apply a strong contrast & saturation curve to eliminate the washed-out / semi-transparent appearance
  // so road networks, contours, building footprints, parks and water bodies are deep and vivid.
  const mapFilter =
    style === 'esri-imagery'
      ? 'none'
      : style === 'esri-topo'
      ? 'contrast(1.42) saturate(1.80) brightness(0.86)'
      : style === 'esri-streets'
      ? 'contrast(1.36) saturate(1.75) brightness(0.88)'
      : 'contrast(1.15) saturate(1.25) brightness(0.95)';

  for (let ty = tileMinY; ty <= tileMaxY; ty++) {
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      const px = (tx - tileMinX) * tileSize;
      const py = (ty - tileMinY) * tileSize;
      const url = getTileUrl(style, zoom, tx, ty);

      const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.filter = mapFilter;
          ctx.drawImage(img, px, py, tileSize, tileSize);
          ctx.filter = 'none';
          texture.needsUpdate = true;
          resolve();
        };
        img.onerror = () => {
          // If a primary tile fails, try secondary reliable tile source
          const fallbackUrl =
            style === 'osm'
              ? `https://${['a', 'b', 'c'][(tx + ty) % 3]}.tile.openstreetmap.fr/hot/${zoom}/${tx}/${ty}.png`
              : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;

          const fallbackImg = new Image();
          fallbackImg.crossOrigin = 'anonymous';
          fallbackImg.onload = () => {
            ctx.filter = mapFilter;
            ctx.drawImage(fallbackImg, px, py, tileSize, tileSize);
            ctx.filter = 'none';
            texture.needsUpdate = true;
            resolve();
          };
          fallbackImg.onerror = () => {
            // Second level fallback to Esri Streets if OSM HOT also fails
            if (style === 'osm') {
              const esriImg = new Image();
              esriImg.crossOrigin = 'anonymous';
              esriImg.onload = () => {
                ctx.filter = mapFilter;
                ctx.drawImage(esriImg, px, py, tileSize, tileSize);
                ctx.filter = 'none';
                texture.needsUpdate = true;
                resolve();
              };
              esriImg.onerror = () => {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(px, py, tileSize, tileSize);
                resolve();
              };
              esriImg.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;
            } else {
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(px, py, tileSize, tileSize);
              resolve();
            }
          };
          fallbackImg.src = fallbackUrl;
        };
        img.src = url;
      });

      tilePromises.push(p);
    }
  }

  // After all tiles finish loading, render scientific map ornaments
  Promise.all(tilePromises).then(() => {
    ctx.filter = 'none';

    // Subtle border
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // North Arrow in top-right
    const naX = canvas.width - 45;
    const naY = 45;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.moveTo(naX, naY - 20);
    ctx.lineTo(naX + 10, naY + 12);
    ctx.lineTo(naX, naY + 6);
    ctx.lineTo(naX - 10, naY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('N', naX - 4, naY - 24);

    // Scale bar in bottom-left
    const barWidthPx = 130;
    const metersPerPx = bounds.widthMeters / canvas.width;
    const barMeters = Math.round((barWidthPx * metersPerPx) / 50) * 50;
    const actualBarPx = barMeters / metersPerPx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(20, canvas.height - 42, actualBarPx + 24, 28);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 22);
    ctx.lineTo(30 + actualBarPx, canvas.height - 22);
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${barMeters} m`, 30, canvas.height - 26);

    texture.needsUpdate = true;
    if (onUpdate) {
      onUpdate(texture, bounds);
    }
  });

  return { texture, bounds };
}
