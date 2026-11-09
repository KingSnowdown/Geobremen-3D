import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Borehole, BoreholeLayer } from '../types/geology';
import { parseGermanUTMCoordinate, utm32ToWgs84 } from './coordinates';
import { computeLambda, normalizeLithology, parseKfClass } from './geothermal';
import DEMO_BREMEN_RAW from '../data/demo.csv?raw';

export interface ParseResult {
  boreholes: Borehole[];
  totalLayers: number;
  stats: {
    boreholeCount: number;
    layerCount: number;
    minEasting: number;
    maxEasting: number;
    minNorthing: number;
    maxNorthing: number;
    minZ: number;
    maxZ: number;
    maxDepth: number;
    areaKm2: number;
    centerEasting: number;
    centerNorthing: number;
    centerLon: number;
    centerLat: number;
    maxCollar: number;
  };
}

export const EMPTY_PARSE_RESULT: ParseResult = {
  boreholes: [],
  totalLayers: 0,
  stats: {
    boreholeCount: 0,
    layerCount: 0,
    minEasting: 491800,
    maxEasting: 492800,
    minNorthing: 5882000,
    maxNorthing: 5882800,
    minZ: -100,
    maxZ: 3.0,
    maxDepth: 0,
    areaKm2: 0,
    centerEasting: 491899,
    centerNorthing: 5882016,
    centerLon: 8.885,
    centerLat: 53.085,
    maxCollar: 3.0,
  },
};

/**
 * Robust numeric parser: preserves 0.00 and handles German comma decimals and quotes
 */
function parseNumberValue(val: any, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim();
  if (str === '' || str === '—' || str === '-' || str === 'NaN') return fallback;
  // Remove thousand spaces/quotes and replace comma with dot
  const cleaned = str.replace(/["']/g, '').replace(/\s+/g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Checks if a value is present (not undefined, null, or empty string)
 */
function isPresent(val: any): boolean {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  return s !== '' && s !== '—' && s !== '-';
}

/**
 * Case-insensitive, symbol-tolerant key finder
 */
function findVal(row: Record<string, any>, possibleKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const k of rowKeys) {
    // Strip BOM, spaces, underscores, brackets
    const cleanK = k
      .replace(/^\ufeff/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    for (const pk of possibleKeys) {
      const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanK === cleanPk) {
        return row[k];
      }
    }
  }
  return undefined;
}

/**
 * Computes unified statistics for an array of Borehole objects
 */
export function computeStatsForBoreholes(boreholes: Borehole[]): ParseResult {
  if (boreholes.length === 0) {
    return EMPTY_PARSE_RESULT;
  }

  let totalLayers = 0;
  let minE = Infinity;
  let maxE = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxCollar = -Infinity;
  let maxDepth = 0;

  for (const bh of boreholes) {
    totalLayers += bh.layers.length;
    if (bh.eastingX > 0) {
      minE = Math.min(minE, bh.eastingX);
      maxE = Math.max(maxE, bh.eastingX);
    }
    if (bh.northingY > 0) {
      minN = Math.min(minN, bh.northingY);
      maxN = Math.max(maxN, bh.northingY);
    }
    minZ = Math.min(minZ, bh.minZ);
    maxZ = Math.max(maxZ, bh.maxZ);
    maxCollar = Math.max(maxCollar, bh.collarElevation);
    maxDepth = Math.max(maxDepth, bh.maxDepth);
  }

  if (!isFinite(minE)) minE = 491800;
  if (!isFinite(maxE)) maxE = 492800;
  if (!isFinite(minN)) minN = 5882000;
  if (!isFinite(maxN)) maxN = 5882800;
  if (!isFinite(minZ)) minZ = -100;
  if (!isFinite(maxZ)) maxZ = 3.0;
  if (!isFinite(maxCollar)) maxCollar = 3.0;

  const centerEasting = (minE + maxE) / 2;
  const centerNorthing = (minN + maxN) / 2;
  const [centerLon, centerLat] = utm32ToWgs84(centerEasting, centerNorthing);

  const deltaX = Math.max(100, maxE - minE);
  const deltaY = Math.max(100, maxN - minN);
  const areaKm2 = Math.round(((deltaX * deltaY) / 1000000) * 100) / 100;

  return {
    boreholes,
    totalLayers,
    stats: {
      boreholeCount: boreholes.length,
      layerCount: totalLayers,
      minEasting: minE,
      maxEasting: maxE,
      minNorthing: minN,
      maxNorthing: maxN,
      minZ,
      maxZ,
      maxDepth,
      areaKm2,
      centerEasting,
      centerNorthing,
      centerLon,
      centerLat,
      maxCollar,
    },
  };
}

/**
 * Standardizes raw row objects into BoreholeLayer objects
 * Uses a robust two-pass strategy:
 * 1. Groups rows per borehole, resolving coordinates & true collar elevation across all rows
 * 2. Computes exact physical depths and elevations (Z m NHN = collar - depth) to eliminate any height offsets
 */
export function processRawRows(
  rows: Record<string, any>[],
  customLambdas?: Record<string, number>
): ParseResult {
  interface RawBoreholeGroup {
    name: string;
    rawRows: {
      rawX: any;
      rawY: any;
      rawAnsatz: any;
      rawVon: any;
      rawBis: any;
      rawDicke: any;
      rawZOben: any;
      rawZUnten: any;
      rawBoden: any;
      rawDetail: any;
      rawKf: any;
      rawProjekt: any;
    }[];
  }

  const boreholeGroups = new Map<string, RawBoreholeGroup>();
  let lastBoreholeName = '';

  for (const row of rows) {
    let bName = String(
      findVal(row, ['Bohrungsname', 'Bohrung', 'Name', 'Bohrpunkt', 'ID', 'Bohrung_Nr', 'Bohrungs_Nr']) || ''
    ).trim();

    // Check if this row is an accidental duplicate header row (e.g. from copy-pasting tables)
    if (
      bName.toLowerCase() === 'bohrungsname' ||
      bName.toLowerCase() === 'bohrung' ||
      bName.toLowerCase() === 'name'
    ) {
      continue;
    }

    const rawVon = findVal(row, [
      'Tiefe_von_m',
      'Tiefe_von',
      'Von',
      'DepthFrom',
      'Tiefe von (m)',
      'Tiefe von [m]',
      'Tiefe von',
      'Tiefevonm',
    ]);
    const rawBis = findVal(row, [
      'Tiefe_bis_m',
      'Tiefe_bis',
      'Bis',
      'DepthTo',
      'Tiefe bis (m)',
      'Tiefe bis [m]',
      'Tiefe bis',
      'Tiefebism',
    ]);

    // Skip row if Von and Bis are both missing or non-numeric headers
    if (!isPresent(rawVon) && !isPresent(rawBis)) {
      continue;
    }
    if (String(rawVon).toLowerCase().includes('tiefe') || String(rawBis).toLowerCase().includes('tiefe')) {
      continue;
    }

    // Handle vertically merged borehole name cells in Excel
    if (!bName && lastBoreholeName) {
      bName = lastBoreholeName;
    }

    if (!bName) {
      bName = 'Unbenannte_Bohrung';
    }
    lastBoreholeName = bName;

    const rawX = findVal(row, [
      'Rechtswert_X',
      'Rechtswert',
      'X',
      'Easting',
      'RW',
      'Rechtswert (m)',
    ]);
    const rawY = findVal(row, [
      'Hochwert_Y',
      'Hochwert',
      'Y',
      'Northing',
      'HW',
      'Hochwert (m)',
    ]);
    const rawAnsatz = findVal(row, [
      'Ansatzhoehe_m_NHN',
      'Ansatzhoehe',
      'Ansatzhöhe',
      'Ansatz',
      'Hoehe',
      'Höhe',
      'GOK',
      'GOK_m',
      'GOK_m_NHN',
      'Gelaendehoehe',
      'Geländehöhe',
      'Z_Ansatz',
      'Z',
      'Ansatzhoehe (m NHN)',
      'Ansatzhoehe m NHN',
      'Höhe (m NHN)',
    ]);
    const rawDicke = findVal(row, [
      'Schichtdicke_m',
      'Schichtdicke',
      'Dicke',
      'Schichtdicke (m)',
      'Schichtdicke m',
    ]);
    const rawZOben = findVal(row, [
      'Z_Oberkante_m_NHN',
      'Z_Oberkante',
      'ZOben',
      'Z-Oberkante',
      'Z_Oberkante (m NHN)',
      'Z_Oberkante m NHN',
      'Oberkante',
    ]);
    const rawZUnten = findVal(row, [
      'Z_Unterkante_m_NHN',
      'Z_Unterkante',
      'ZUnten',
      'Z-Unterkante',
      'Z_Unterkante (m NHN)',
      'Z_Unterkante m NHN',
      'Unterkante',
    ]);
    const rawBoden = findVal(row, [
      'Hauptbodenart',
      'Bodenart',
      'Lithologie',
      'Boden',
      'Schichtart',
    ]);
    const rawDetail = findVal(row, [
      'Beschreibung_Detail',
      'Beschreibung',
      'Detail',
      'Schichtbeschreibung',
      'Bemerkung',
    ]);
    const rawKf = findVal(row, [
      'kf_Wert_HKA1997',
      'kf_Wert',
      'kf',
      'kf-Wert',
      'kfWert',
      'Durchlaessigkeit',
    ]);
    const rawProjekt = findVal(row, [
      'Projekt',
      'Project',
      'Standort',
      'Bezeichnung',
      'Ort',
    ]);

    if (!boreholeGroups.has(bName)) {
      boreholeGroups.set(bName, { name: bName, rawRows: [] });
    }
    boreholeGroups.get(bName)!.rawRows.push({
      rawX,
      rawY,
      rawAnsatz,
      rawVon,
      rawBis,
      rawDicke,
      rawZOben,
      rawZUnten,
      rawBoden,
      rawDetail,
      rawKf,
      rawProjekt,
    });
  }

  // Pre-pass: calculate dataset's typical terrain elevation from all valid collar values (-15m to +35m NHN)
  const validCollars: number[] = [];
  for (const group of boreholeGroups.values()) {
    for (const r of group.rawRows) {
      if (isPresent(r.rawAnsatz)) {
        const val = parseNumberValue(r.rawAnsatz);
        if (val !== 0 && val >= -15 && val <= 35) {
          validCollars.push(val);
          break;
        }
      }
    }
  }
  validCollars.sort((a, b) => a - b);
  const typicalCollarElevation =
    validCollars.length > 0 ? validCollars[Math.floor(validCollars.length / 2)] : 3.0;

  // PASS 2: For each borehole, resolve true coordinates, collar elevation and layers
  const boreholes: Borehole[] = [];
  let layerIndexCounter = 0;

  for (const [bName, group] of boreholeGroups.entries()) {
    if (group.rawRows.length === 0) continue;

    // 1. Resolve Easting & Northing
    let easting = 0;
    let northing = 0;
    for (const r of group.rawRows) {
      if (isPresent(r.rawX)) {
        const parsedX = parseGermanUTMCoordinate(r.rawX, true);
        if (parsedX > 0 && easting === 0) easting = parsedX;
      }
      if (isPresent(r.rawY)) {
        const parsedY = parseGermanUTMCoordinate(r.rawY, false);
        if (parsedY > 0 && northing === 0) northing = parsedY;
      }
      if (easting > 0 && northing > 0) break;
    }

    // 2. Resolve Collar Elevation (Ansatzhoehe m NHN)
    // Check all rows for explicit Ansatzhöhe. In German drilling practice, 100m is an assumed
    // local benchmark (Bezugshöhe 100,00m) when official NHN is not yet surveyed.
    let isRelativeBenchmark = false;
    let collarElevation: number | null = null;
    for (const r of group.rawRows) {
      if (isPresent(r.rawAnsatz)) {
        const val = parseNumberValue(r.rawAnsatz);
        if (val !== 0) {
          if (val >= 50 || Math.abs(val - 100) < 5) {
            isRelativeBenchmark = true;
            collarElevation = typicalCollarElevation;
          } else {
            collarElevation = val;
          }
          break;
        }
      }
    }

    // If still null, check if any row has Z_Oberkante and depthFrom
    if (collarElevation === null) {
      for (const r of group.rawRows) {
        if (isPresent(r.rawZOben) && isPresent(r.rawVon)) {
          const zObenVal = parseNumberValue(r.rawZOben);
          const vonVal = parseNumberValue(r.rawVon);
          // Only derive if Z_Oberkante looks like an absolute elevation, not a positive depth
          const candidateCollar = zObenVal + vonVal;
          if (candidateCollar >= -5 && candidateCollar <= 35) {
            collarElevation = candidateCollar;
            break;
          } else if (candidateCollar >= 50 || Math.abs(candidateCollar - 100) < 5) {
            isRelativeBenchmark = true;
            collarElevation = typicalCollarElevation;
            break;
          }
        }
      }
    }

    // Default to typical Bremen terrain standard if completely omitted in file
    if (collarElevation === null) {
      collarElevation = typicalCollarElevation;
    }

    // 3. Resolve Project
    let project = 'Bremen-Bohrung';
    for (const r of group.rawRows) {
      if (isPresent(r.rawProjekt)) {
        project = String(r.rawProjekt).trim();
        break;
      }
    }

    // 4. Construct BoreholeLayers with verified physical elevation
    const layers: BoreholeLayer[] = [];

    for (const r of group.rawRows) {
      const depthFrom = parseNumberValue(r.rawVon, 0);
      const depthTo = parseNumberValue(r.rawBis, depthFrom + 1.0);
      const thickness = isPresent(r.rawDicke)
        ? parseNumberValue(r.rawDicke, Math.abs(depthTo - depthFrom))
        : Math.abs(depthTo - depthFrom) || 0.1;

      // Mathematical ground truth: Z elevation = collar - depth
      const calculatedZTop = collarElevation - depthFrom;
      const calculatedZBottom = collarElevation - depthTo;

      let zTop = calculatedZTop;
      let zBottom = calculatedZBottom;

      // If explicit Z_Oberkante is provided, verify whether it matches true elevation or is raw depth/dummy benchmark
      if (!isRelativeBenchmark && isPresent(r.rawZOben)) {
        const rawZTopVal = parseNumberValue(r.rawZOben);
        // If rawZTopVal is within 1.5m of calculated elevation, driller calculated it accurately
        if (Math.abs(rawZTopVal - calculatedZTop) <= 1.5) {
          zTop = rawZTopVal;
          if (isPresent(r.rawZUnten)) {
            zBottom = parseNumberValue(r.rawZUnten, calculatedZBottom);
          }
        }
      }

      const lithology = normalizeLithology(String(r.rawBoden || ''));
      const descriptionDetail = String(r.rawDetail || '').trim();
      const kfRaw = String(r.rawKf || '—').trim();
      const kfClass = parseKfClass(kfRaw);

      const lambda = computeLambda(
        lithology,
        descriptionDetail,
        customLambdas as any
      );

      layerIndexCounter++;
      layers.push({
        id: `${bName}_idx${layerIndexCounter}_${depthFrom}_${depthTo}`,
        boreholeName: bName,
        project,
        depthFrom,
        depthTo,
        thickness,
        zTop,
        zBottom,
        lithology,
        descriptionDetail,
        kfRaw,
        kfClass,
        lambda,
      });
    }

    // Sort layers ascending by depthFrom
    layers.sort((a, b) => a.depthFrom - b.depthFrom);

    let bhMinZ = collarElevation;
    let bhMaxZ = collarElevation;
    let bhMaxDepth = 0;

    for (const l of layers) {
      if (l.zBottom < bhMinZ) bhMinZ = l.zBottom;
      if (l.zTop > bhMaxZ) bhMaxZ = l.zTop;
      if (l.depthTo > bhMaxDepth) bhMaxDepth = l.depthTo;
    }

    const wgs84 = utm32ToWgs84(easting, northing);

    boreholes.push({
      id: bName,
      name: bName,
      project,
      eastingX: easting,
      northingY: northing,
      collarElevation,
      maxDepth: bhMaxDepth,
      minZ: bhMinZ,
      maxZ: bhMaxZ,
      layers,
      wgs84,
    });
  }

  return computeStatsForBoreholes(boreholes);
}

/**
 * Merges two ParseResult datasets (e.g. adding a second Excel to an existing dataset)
 */
export function mergeParseResults(
  existing: ParseResult,
  incoming: ParseResult
): ParseResult {
  if (existing.boreholes.length === 0) return incoming;
  if (incoming.boreholes.length === 0) return existing;

  const bhMap = new Map<string, Borehole>();

  // Add all existing boreholes
  for (const b of existing.boreholes) {
    bhMap.set(b.name, b);
  }

  // Append incoming boreholes; if name matches, append with suffix
  for (const b of incoming.boreholes) {
    let key = b.name;
    if (bhMap.has(key)) {
      // If same borehole name already exists from previous file, add suffix
      key = `${b.name}_Datei2`;
      bhMap.set(key, { ...b, id: key, name: key });
    } else {
      bhMap.set(key, b);
    }
  }

  const combinedBoreholes = Array.from(bhMap.values());
  return computeStatsForBoreholes(combinedBoreholes);
}

/**
 * Parse CSV string
 */
export function parseCSVData(
  csvContent: string,
  customLambdas?: Record<string, number>
): ParseResult {
  if (!csvContent || csvContent.trim() === '') {
    return EMPTY_PARSE_RESULT;
  }

  const cleanCsv = csvContent.replace(/^\ufeff/, '');

  const result = Papa.parse(cleanCsv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return processRawRows(result.data as Record<string, any>[], customLambdas);
}

/**
 * Parse Excel file (ArrayBuffer from .xlsx or .xls)
 * Parses ALL sheets in the workbook and aggregates them
 */
export function parseExcelData(
  buffer: ArrayBuffer,
  customLambdas?: Record<string, number>
): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const allRows: Record<string, any>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    }) as Record<string, any>[];
    allRows.push(...rows);
  }

  return processRawRows(allRows, customLambdas);
}

/**
 * Comprehensive demo dataset for Bremen (179 boreholes, 1,920 geological strata across Bremen)
 */
export const DEMO_BREMEN_CSV = DEMO_BREMEN_RAW;
