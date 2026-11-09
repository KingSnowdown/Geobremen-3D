export type HauptbodenartType =
  | 'Feinsand'
  | 'Mittelsand'
  | 'Grobsand'
  | 'Sand'
  | 'Kies'
  | 'Steine'
  | 'Schluff'
  | 'Ton'
  | 'Torf'
  | 'Geschiebemergel'
  | 'Leerschicht / keine Angabe';

export interface BoreholeLayer {
  id: string;
  boreholeName: string;
  project: string;
  depthFrom: number; // m
  depthTo: number; // m
  thickness: number; // m
  zTop: number; // m NHN
  zBottom: number; // m NHN
  lithology: HauptbodenartType;
  descriptionDetail: string;
  kfRaw: string;
  kfClass: number; // 1 (sehr hoch) to 6 (sehr gering), 0 for unknown
  lambda: number; // W/(m*K)
}

export interface Borehole {
  id: string;
  name: string;
  project: string;
  eastingX: number; // EPSG:25832 UTM Zone 32 (without 32 prefix, e.g. 491899.94)
  northingY: number; // EPSG:25832 UTM Zone 32 (e.g. 5882016.92)
  collarElevation: number; // Ansatzhöhe m NHN
  maxDepth: number; // m
  minZ: number; // m NHN
  maxZ: number; // m NHN
  layers: BoreholeLayer[];
  wgs84: [number, number]; // [lon, lat]
}

export type ViewMode = 'lithology' | 'lambda' | 'kf';

export interface InterpolationSettings {
  idwExponent: number; // default 2.0
  gridResolutionXY: number; // e.g. 35 cells
  sliceThicknessZ: number; // e.g. 2.0 m
  zExaggeration: number; // default 8x
  boreholeRadius: number; // default 3.5 m
  voxelOpacity: number; // 0.1 to 1.0
  voxelSizeFactor: number; // 0.6 to 1.0
  mapElevationM: number; // m NHN (elevation of the terrain map plane)
}

export interface ClippingSettings {
  enabled: boolean;
  minXPercent: number; // 0 to 100
  maxXPercent: number; // 0 to 100
  minYPercent: number; // 0 to 100
  maxYPercent: number; // 0 to 100
  maxDepthZ: number; // m NHN cut from top/bottom
}

export interface VoxelData {
  worldX: number; // UTM
  worldY: number; // UTM
  worldZ: number; // m NHN
  gridI: number;
  gridJ: number;
  gridK: number;
  lithology: HauptbodenartType;
  lambda: number;
  kfClass: number;
}

export interface GeothermalProbeResult {
  x: number;
  y: number;
  depthM: number; // e.g. 100m
  meanLambda: number; // W/(m*K)
  specificExtractionRate: number; // W/m (VDI 4640)
  totalAnnualYieldKwh: number; // 1800h operation
  profileBreakdown: {
    depth: number;
    lithology: HauptbodenartType;
    lambda: number;
  }[];
}
