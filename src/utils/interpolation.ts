import {
  Borehole,
  GeothermalProbeResult,
  HauptbodenartType,
  InterpolationSettings,
  VoxelData,
} from '../types/geology';
import { calculateVdi4640ExtractionRate } from './geothermal';

export interface InterpolationResult {
  voxels: VoxelData[];
  gridDims: {
    nx: number;
    ny: number;
    nz: number;
    dx: number;
    dy: number;
    dz: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * Computes 3D Voxel Grid using Horizontal Inverse Distance Weighting (IDW) along depth slices
 */
export function interpolateVoxelGrid(
  boreholes: Borehole[],
  settings: InterpolationSettings
): InterpolationResult {
  if (boreholes.length === 0) {
    return {
      voxels: [],
      gridDims: {
        nx: 0,
        ny: 0,
        nz: 0,
        dx: 1,
        dy: 1,
        dz: 1,
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        minZ: 0,
        maxZ: 1,
      },
    };
  }

  // 1. Compute horizontal and vertical bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const b of boreholes) {
    minX = Math.min(minX, b.eastingX);
    maxX = Math.max(maxX, b.eastingX);
    minY = Math.min(minY, b.northingY);
    maxY = Math.max(maxY, b.northingY);
    minZ = Math.min(minZ, b.minZ);
    maxZ = Math.max(maxZ, b.maxZ);
  }

  // Add 10% margin horizontally for boundary context
  const spanX = Math.max(80, maxX - minX);
  const spanY = Math.max(80, maxY - minY);
  const marginX = spanX * 0.12;
  const marginY = spanY * 0.12;

  const gridMinX = minX - marginX;
  const gridMaxX = maxX + marginX;
  const gridMinY = minY - marginY;
  const gridMaxY = maxY + marginY;

  // Grid resolution
  const nx = Math.max(15, Math.min(60, settings.gridResolutionXY));
  const ny = Math.max(15, Math.min(60, Math.round((nx * spanY) / spanX)));

  const totalZSpan = Math.max(5, maxZ - minZ);
  const targetDz = Math.max(1.0, settings.sliceThicknessZ);
  // Calculate nz so slices cover the entire vertical span down to minZ without truncation
  const nz = Math.max(5, Math.min(80, Math.round(totalZSpan / targetDz)));
  const dz = totalZSpan / nz;

  const dx = (gridMaxX - gridMinX) / nx;
  const dy = (gridMaxY - gridMinY) / ny;

  const p = settings.idwExponent;
  const voxels: VoxelData[] = [];

  // 2. Loop over Z slices from top to bottom
  for (let k = 0; k < nz; k++) {
    const curZ = maxZ - (k + 0.5) * dz;

    // Find which boreholes have a layer at this Z
    const activeBoreholeSamples: {
      x: number;
      y: number;
      lithology: HauptbodenartType;
      lambda: number;
      kfClass: number;
    }[] = [];

    for (const b of boreholes) {
      // Find layer encompassing curZ
      let matchingLayer = b.layers.find(
        (l) => curZ <= l.zTop + 0.05 && curZ >= l.zBottom - 0.05
      );

      // If curZ is above collar or below deepest, clamp to closest if within reasonable range
      if (!matchingLayer && b.layers.length > 0) {
        if (curZ > b.maxZ && curZ - b.maxZ < 3) {
          matchingLayer = b.layers[0];
        } else if (curZ < b.minZ && b.minZ - curZ < 5) {
          matchingLayer = b.layers[b.layers.length - 1];
        }
      }

      if (matchingLayer && matchingLayer.lithology !== 'Leerschicht / keine Angabe') {
        activeBoreholeSamples.push({
          x: b.eastingX,
          y: b.northingY,
          lithology: matchingLayer.lithology,
          lambda: matchingLayer.lambda,
          kfClass: matchingLayer.kfClass,
        });
      }
    }

    if (activeBoreholeSamples.length === 0) {
      continue;
    }

    // 3. For each cell in the XY grid at this slice
    for (let j = 0; j < ny; j++) {
      const curY = gridMinY + (j + 0.5) * dy;

      for (let i = 0; i < nx; i++) {
        const curX = gridMinX + (i + 0.5) * dx;

        let sumWeights = 0;
        let weightedLambdaSum = 0;
        let weightedKfSum = 0;
        let exactMatch: (typeof activeBoreholeSamples)[0] | null = null;

        const lithologyWeights: Partial<Record<HauptbodenartType, number>> = {};

        for (const s of activeBoreholeSamples) {
          const distSq = (curX - s.x) ** 2 + (curY - s.y) ** 2;
          if (distSq < 0.25) {
            exactMatch = s;
            break;
          }

          const dist = Math.sqrt(distSq);
          const w = 1.0 / Math.pow(dist, p);

          sumWeights += w;
          weightedLambdaSum += w * s.lambda;
          weightedKfSum += w * (s.kfClass || 3);

          lithologyWeights[s.lithology] =
            (lithologyWeights[s.lithology] || 0) + w;
        }

        let finalLithology: HauptbodenartType = 'Sand';
        let finalLambda = 2.2;
        let finalKf = 3;

        if (exactMatch) {
          finalLithology = exactMatch.lithology;
          finalLambda = exactMatch.lambda;
          finalKf = exactMatch.kfClass || 3;
        } else if (sumWeights > 0) {
          finalLambda = Math.round((weightedLambdaSum / sumWeights) * 100) / 100;
          finalKf = Math.round(weightedKfSum / sumWeights);

          // Find lithology with highest weight sum
          let maxW = -1;
          for (const [lith, w] of Object.entries(lithologyWeights)) {
            if (w !== undefined && w > maxW) {
              maxW = w;
              finalLithology = lith as HauptbodenartType;
            }
          }
        }

        voxels.push({
          worldX: curX,
          worldY: curY,
          worldZ: curZ,
          gridI: i,
          gridJ: j,
          gridK: k,
          lithology: finalLithology,
          lambda: finalLambda,
          kfClass: finalKf,
        });
      }
    }
  }

  return {
    voxels,
    gridDims: {
      nx,
      ny,
      nz,
      dx,
      dy,
      dz,
      minX: gridMinX,
      maxX: gridMaxX,
      minY: gridMinY,
      maxY: gridMaxY,
      minZ,
      maxZ,
    },
  };
}

/**
 * Calculates a virtual 100m borehole probe at a specific UTM (X, Y) coordinate
 */
export function calculateVirtualProbe(
  targetX: number,
  targetY: number,
  boreholes: Borehole[],
  idwExponent = 2.0,
  probeDepth = 100
): GeothermalProbeResult {
  if (boreholes.length === 0) {
    return {
      x: targetX,
      y: targetY,
      depthM: probeDepth,
      meanLambda: 2.2,
      specificExtractionRate: 50,
      totalAnnualYieldKwh: 9000,
      profileBreakdown: [],
    };
  }

  // Find surface elevation by IDW of collars
  let sumCollarWeights = 0;
  let weightedCollar = 0;
  for (const b of boreholes) {
    const d = Math.max(0.5, Math.hypot(targetX - b.eastingX, targetY - b.northingY));
    const w = 1.0 / Math.pow(d, idwExponent);
    sumCollarWeights += w;
    weightedCollar += w * b.collarElevation;
  }
  const surfaceZ =
    sumCollarWeights > 0 ? weightedCollar / sumCollarWeights : 2.5;

  const stepM = 2.0;
  const steps = Math.round(probeDepth / stepM);
  const profileBreakdown: GeothermalProbeResult['profileBreakdown'] = [];

  let lambdaSum = 0;

  for (let s = 0; s < steps; s++) {
    const depth = s * stepM + stepM * 0.5;
    const curZ = surfaceZ - depth;

    let sumW = 0;
    let wLambda = 0;
    const lithWeights: Partial<Record<HauptbodenartType, number>> = {};

    for (const b of boreholes) {
      let layer = b.layers.find(
        (l) => curZ <= l.zTop + 0.1 && curZ >= l.zBottom - 0.1
      );
      if (!layer && b.layers.length > 0) {
        if (curZ > b.maxZ) layer = b.layers[0];
        else layer = b.layers[b.layers.length - 1];
      }

      if (layer) {
        const d = Math.max(0.5, Math.hypot(targetX - b.eastingX, targetY - b.northingY));
        const w = 1.0 / Math.pow(d, idwExponent);
        sumW += w;
        wLambda += w * layer.lambda;
        lithWeights[layer.lithology] = (lithWeights[layer.lithology] || 0) + w;
      }
    }

    let segLambda = 2.2;
    let segLith: HauptbodenartType = 'Feinsand';

    if (sumW > 0) {
      segLambda = wLambda / sumW;
      let maxW = -1;
      for (const [lith, w] of Object.entries(lithWeights)) {
        if (w !== undefined && w > maxW) {
          maxW = w;
          segLith = lith as HauptbodenartType;
        }
      }
    }

    lambdaSum += segLambda;
    profileBreakdown.push({
      depth,
      lithology: segLith,
      lambda: Math.round(segLambda * 100) / 100,
    });
  }

  const meanLambda = Math.round((lambdaSum / steps) * 100) / 100;
  const { specificExtractionRate } = calculateVdi4640ExtractionRate(meanLambda);
  const totalAnnualYieldKwh = Math.round(
    (specificExtractionRate * probeDepth * 1800) / 1000
  );

  return {
    x: targetX,
    y: targetY,
    depthM: probeDepth,
    meanLambda,
    specificExtractionRate,
    totalAnnualYieldKwh,
    profileBreakdown,
  };
}

/**
 * Generate CSV 2D Raster of thermal conductivity for export to ArcGIS Pro / QGIS
 */
export function generateArcGisRasterCsv(
  voxels: VoxelData[],
  gridDims: InterpolationResult['gridDims']
): string {
  // Aggregate mean lambda vertically per (gridI, gridJ)
  const cellMap = new Map<
    string,
    { x: number; y: number; lambdaSum: number; count: number; liths: Record<string, number> }
  >();

  for (const v of voxels) {
    const key = `${v.gridI}_${v.gridJ}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, {
        x: v.worldX,
        y: v.worldY,
        lambdaSum: 0,
        count: 0,
        liths: {},
      });
    }
    const cell = cellMap.get(key)!;
    cell.lambdaSum += v.lambda;
    cell.count += 1;
    cell.liths[v.lithology] = (cell.liths[v.lithology] || 0) + 1;
  }

  const header =
    'Rechtswert_X,Hochwert_Y,Mean_Lambda_WmK,Est_Extraction_Wm,Top_Lithology,Grid_Cell_Size_m\n';
  let body = '';

  for (const cell of cellMap.values()) {
    const meanL = cell.count > 0 ? cell.lambdaSum / cell.count : 2.0;
    const roundedL = Math.round(meanL * 100) / 100;
    const { specificExtractionRate } = calculateVdi4640ExtractionRate(roundedL);

    let domLith = 'Sand';
    let maxCnt = -1;
    for (const [lith, cnt] of Object.entries(cell.liths)) {
      if (cnt > maxCnt) {
        maxCnt = cnt;
        domLith = lith;
      }
    }

    body += `${cell.x.toFixed(2)},${cell.y.toFixed(2)},${roundedL},${specificExtractionRate},"${domLith}",${gridDims.dx.toFixed(1)}\n`;
  }

  return header + body;
}
