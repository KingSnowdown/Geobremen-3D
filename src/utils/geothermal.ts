import { HauptbodenartType } from '../types/geology';

export interface LithologyParam {
  name: HauptbodenartType;
  color: string;
  defaultLambda: number; // W/(m*K)
  description: string;
  typicalKf: string;
}

export const LITHOLOGY_CONFIG: Record<HauptbodenartType, LithologyParam> = {
  Torf: {
    name: 'Torf',
    color: '#4A2E1B',
    defaultLambda: 0.4,
    description: 'Organischer Boden, sehr geringe Wärmeleitfähigkeit & Durchlässigkeit',
    typicalKf: '6 – sehr gering',
  },
  Ton: {
    name: 'Ton',
    color: '#6B5B95',
    defaultLambda: 1.5,
    description: 'Bindiger Boden / Stauer, geringe Wärmeleitfähigkeit',
    typicalKf: '6 – sehr gering',
  },
  Schluff: {
    name: 'Schluff',
    color: '#88B04B',
    defaultLambda: 1.8,
    description: 'Feinkornsediment / schwacher Stauer',
    typicalKf: '5–6 (gering bis sehr gering)',
  },
  Feinsand: {
    name: 'Feinsand',
    color: '#FFE66D',
    defaultLambda: 2.2,
    description: 'Porenreicher Sand, mäßige bis mittlere Durchlässigkeit',
    typicalKf: '4 – mäßig',
  },
  Mittelsand: {
    name: 'Mittelsand',
    color: '#F4A261',
    defaultLambda: 2.4,
    description: 'Hauptgrundwasserleiter, gute thermische Leitfähigkeit',
    typicalKf: '3 – mittel',
  },
  Grobsand: {
    name: 'Grobsand',
    color: '#E76F51',
    defaultLambda: 2.6,
    description: 'Hochdurchlässiger Leiter mit hoher Wärmeleitfähigkeit',
    typicalKf: '2 – hoch',
  },
  Sand: {
    name: 'Sand',
    color: '#E9C46A',
    defaultLambda: 2.3,
    description: 'Gemischtkörniger Sand (Quartär)',
    typicalKf: '3–4',
  },
  Kies: {
    name: 'Kies',
    color: '#D62828',
    defaultLambda: 2.8,
    description: 'Grobklastisches Sediment, exzellenter Wärmeleiter',
    typicalKf: '1–2 (hoch bis sehr hoch)',
  },
  Steine: {
    name: 'Steine',
    color: '#9B2226',
    defaultLambda: 3.0,
    description: 'Grobes Geröll / Geschiebeblöcke',
    typicalKf: '1 – sehr hoch',
  },
  Geschiebemergel: {
    name: 'Geschiebemergel',
    color: '#8C7853',
    defaultLambda: 2.1,
    description: 'Glazigenes Sediment (Drenthe-Moräne)',
    typicalKf: '5 – gering',
  },
  'Leerschicht / keine Angabe': {
    name: 'Leerschicht / keine Angabe',
    color: '#94a3b8',
    defaultLambda: 2.0,
    description: 'Nicht klassifizierte oder fehlende Schichtaufnahme',
    typicalKf: '—',
  },
};

/**
 * Standardize text into known Hauptbodenart
 */
export function normalizeLithology(raw: string): HauptbodenartType {
  if (!raw) return 'Leerschicht / keine Angabe';
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('torf') || lower.includes('humus') || lower === 'hz') return 'Torf';
  if (lower.includes('geschiebemergel') || lower.includes('mergel') || lower === 'lg') return 'Geschiebemergel';
  if (lower.includes('ton') || lower === 'ts') return 'Ton';
  if (lower.includes('schluff') || lower === 'l' || lower.includes('lehm') || lower.includes('löss')) return 'Schluff';
  if (lower.includes('kies')) return 'Kies';
  if (lower.includes('stein')) return 'Steine';
  if (lower.includes('grobsand')) return 'Grobsand';
  if (lower.includes('mittelsand')) return 'Mittelsand';
  if (lower.includes('feinsand')) return 'Feinsand';
  if (lower.includes('sand')) return 'Sand';

  return 'Leerschicht / keine Angabe';
}

/**
 * Parses kf string (e.g. "4 – mäßig", "1 – sehr hoch", "—") into numeric class 1-6
 */
export function parseKfClass(raw: string): number {
  if (!raw) return 0;
  const match = raw.match(/([1-6])/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

export const KF_NAMES: Record<number, string> = {
  1: '1 – sehr hoch (> 10⁻³ m/s)',
  2: '2 – hoch (10⁻⁴ – 10⁻³ m/s)',
  3: '3 – mittel (10⁻⁵ – 10⁻⁴ m/s)',
  4: '4 – mäßig (10⁻⁶ – 10⁻⁵ m/s)',
  5: '5 – gering (10⁻⁸ – 10⁻⁶ m/s)',
  6: '6 – sehr gering (< 10⁻⁸ m/s)',
  0: 'Keine Angabe / Unbekannt',
};

export const KF_COLORS: Record<number, string> = {
  1: '#0284c7', // Sky blue
  2: '#06b6d4', // Cyan
  3: '#10b981', // Emerald
  4: '#eab308', // Amber
  5: '#f97316', // Orange
  6: '#ef4444', // Red (aquitard)
  0: '#64748b', // Slate
};

/**
 * Computes thermal conductivity lambda with detailed petrographic description modifier bonus logic
 */
export function computeLambda(
  lithology: HauptbodenartType,
  detail = '',
  customBaseOverrides?: Partial<Record<HauptbodenartType, number>>
): number {
  const base =
    customBaseOverrides?.[lithology] ??
    LITHOLOGY_CONFIG[lithology]?.defaultLambda ??
    2.0;

  if (lithology === 'Leerschicht / keine Angabe') {
    return base;
  }

  let modifier = 0;
  const lowerDetail = (detail || '').toLowerCase();

  // Fining components reduce lambda in sands
  if (lowerDetail.includes('schluffig') || lowerDetail.includes('tonig')) {
    modifier -= 0.15;
  }
  if (lowerDetail.includes('humos')) {
    modifier -= 0.1;
  }

  // Coarsening components increase lambda
  if (lowerDetail.includes('grobsandig') || lowerDetail.includes('kiesig')) {
    modifier += 0.15;
  }
  if (lowerDetail.includes('steinig')) {
    modifier += 0.1;
  }

  // Clamped to realistic quaternary range [0.3, 3.5] W/(m*K)
  const result = Math.max(0.3, Math.min(3.5, base + modifier));
  return Math.round(result * 100) / 100;
}

export interface LambdaColorStop {
  lambda: number;
  hex: string;
  r: number;
  g: number;
  b: number;
  label: string;
}

export const LAMBDA_MIN = 0.4;
export const LAMBDA_MAX = 3.0;

export const LAMBDA_COLOR_STOPS: LambdaColorStop[] = [
  { lambda: 0.4, hex: '#2563eb', r: 37,  g: 99,  b: 235, label: 'Torf (0.4)' },
  { lambda: 1.2, hex: '#06b6d4', r: 6,   g: 182, b: 212, label: 'Ton (1.2–1.5)' },
  { lambda: 1.8, hex: '#10b981', r: 16,  g: 185, b: 129, label: 'Schluff (1.8)' },
  { lambda: 2.2, hex: '#84cc16', r: 132, g: 204, b: 22,  label: 'Feinsand (2.2)' },
  { lambda: 2.4, hex: '#eab308', r: 234, g: 179, b: 8,   label: 'Mittelsand (2.4)' },
  { lambda: 2.6, hex: '#f97316', r: 249, g: 115, b: 22,  label: 'Grobsand (2.6)' },
  { lambda: 3.0, hex: '#dc2626', r: 220, g: 38,  b: 38,  label: 'Kies / Steine (≥ 2.8)' },
];

// Unified CSS linear-gradient matching getLambdaColor exactly
export const LAMBDA_GRADIENT_CSS =
  'linear-gradient(to right, ' +
  LAMBDA_COLOR_STOPS.map(
    (s) =>
      `${s.hex} ${(((s.lambda - LAMBDA_MIN) / (LAMBDA_MAX - LAMBDA_MIN)) * 100).toFixed(1)}%`
  ).join(', ') +
  ')';

/**
 * Continuous Scientific Heatmap Color Scale for Lambda (from 0.4 to 3.0 W/m*K)
 * Blue (low conductivity) -> Cyan -> Green -> Lime -> Yellow -> Orange -> Red (high conductivity)
 * Uses exact piecewise-linear interpolation matching LAMBDA_GRADIENT_CSS 100%
 */
export function getLambdaColor(lambda: number): string {
  const val = Math.max(LAMBDA_MIN, Math.min(LAMBDA_MAX, lambda));

  for (let i = 0; i < LAMBDA_COLOR_STOPS.length - 1; i++) {
    const s0 = LAMBDA_COLOR_STOPS[i];
    const s1 = LAMBDA_COLOR_STOPS[i + 1];

    if (val >= s0.lambda && val <= s1.lambda) {
      const ratio = (val - s0.lambda) / (s1.lambda - s0.lambda);
      const r = Math.round(s0.r + (s1.r - s0.r) * ratio);
      const g = Math.round(s0.g + (s1.g - s0.g) * ratio);
      const b = Math.round(s0.b + (s1.b - s0.b) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const last = LAMBDA_COLOR_STOPS[LAMBDA_COLOR_STOPS.length - 1];
  return `rgb(${last.r}, ${last.g}, ${last.b})`;
}

/**
 * Calculate specific extraction rate (W/m) according to VDI 4640 (Part 2)
 * For water-saturated pore aquifers (Bremen typical):
 * Mean lambda ~ 2.0 -> ~ 45 - 50 W/m
 * Mean lambda ~ 2.6 -> ~ 60 - 70 W/m
 */
export function calculateVdi4640ExtractionRate(meanLambda: number): {
  specificExtractionRate: number; // W/m
  rating: string;
} {
  // Empirical correlation from VDI 4640 Blatt 2 Table for double-U probe 1800-2400 h/a
  // e.g., Dry sediment: 20-25 W/m
  // Saturated clay/silt (lambda 1.5 - 1.8): 30-40 W/m
  // Saturated sand/gravel (lambda 2.2 - 2.8): 55-70 W/m
  const qE = Math.round((meanLambda * 22.5 + 3.0) * 10) / 10;
  const clampedQ = Math.max(18, Math.min(80, qE));

  let rating = 'Mittel';
  if (clampedQ < 30) rating = 'Gering (ungeeignet / bindig)';
  else if (clampedQ < 45) rating = 'Mäßig (ausreichend)';
  else if (clampedQ < 60) rating = 'Gut (sehr wirtschaftlich)';
  else rating = 'Sehr gut (optimaler Grundwasserleiter)';

  return { specificExtractionRate: clampedQ, rating };
}
