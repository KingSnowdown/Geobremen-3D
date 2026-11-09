import React from 'react';
import {
  Activity,
  Flame,
  Info,
  Layers,
  MapPin,
  X,
  Zap,
} from 'lucide-react';
import { GeothermalProbeResult } from '../types/geology';
import { LITHOLOGY_CONFIG } from '../utils/geothermal';
import { utm32ToWgs84 } from '../utils/coordinates';

interface GeothermalCardProps {
  probe: GeothermalProbeResult | null;
  onClose: () => void;
}

export const GeothermalCard: React.FC<GeothermalCardProps> = ({
  probe,
  onClose,
}) => {
  if (!probe) return null;

  const [lon, lat] = utm32ToWgs84(probe.x, probe.y);

  // Group profile segments into contiguous strata
  const strata: {
    lithology: string;
    from: number;
    to: number;
    color: string;
    lambda: number;
  }[] = [];

  if (probe.profileBreakdown.length > 0) {
    let current = {
      lithology: probe.profileBreakdown[0].lithology,
      from: 0,
      to: 2,
      color:
        LITHOLOGY_CONFIG[probe.profileBreakdown[0].lithology]?.color ||
        '#cbd5e1',
      lambda: probe.profileBreakdown[0].lambda,
      lambdaSum: probe.profileBreakdown[0].lambda,
      count: 1,
    };

    for (let i = 1; i < probe.profileBreakdown.length; i++) {
      const p = probe.profileBreakdown[i];
      if (p.lithology === current.lithology) {
        current.to = p.depth + 1;
        current.lambdaSum += p.lambda;
        current.count += 1;
      } else {
        strata.push({
          lithology: current.lithology,
          from: current.from,
          to: current.to,
          color: current.color,
          lambda: Math.round((current.lambdaSum / current.count) * 100) / 100,
        });
        current = {
          lithology: p.lithology,
          from: current.to,
          to: p.depth + 1,
          color: LITHOLOGY_CONFIG[p.lithology]?.color || '#cbd5e1',
          lambda: p.lambda,
          lambdaSum: p.lambda,
          count: 1,
        };
      }
    }
    strata.push({
      lithology: current.lithology,
      from: current.from,
      to: current.to,
      color: current.color,
      lambda: Math.round((current.lambdaSum / current.count) * 100) / 100,
    });
  }

  return (
    <div className="absolute top-18 right-4 z-20 w-84 sm:w-92 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-4 text-slate-200 select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Geothermie-Potenzial
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Virtuelle Sonde (100 m)
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinate Bar */}
      <div className="mt-3 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {probe.x.toFixed(1)} E / {probe.y.toFixed(1)} N
          </span>
        </div>
        <span className="text-slate-500">
          {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
        </span>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 gap-2 mt-3 font-mono">
        {/* Mean Lambda */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/30">
          <div className="flex items-center gap-1 text-[10px] text-sky-300 uppercase tracking-wider font-sans">
            <Activity className="w-3 h-3 text-sky-400" />
            <span>Mittlere Leitfähigkeit</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {probe.meanLambda.toFixed(2)}
            <span className="text-xs font-normal text-slate-400 ml-1">
              W/(m·K)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
            Schichtgewichtet 0–100 m
          </div>
        </div>

        {/* Specific Extraction Rate */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30">
          <div className="flex items-center gap-1 text-[10px] text-amber-300 uppercase tracking-wider font-sans">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Spez. Entzugsleistung</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
            <span className="text-xl font-bold text-white">
              {probe.specificExtractionRate.toFixed(1)}
              <span className="text-xs font-normal text-slate-400 ml-1">W/m</span>
            </span>
            <span className="text-xs text-slate-500 font-sans">·</span>
            <span className="text-sm font-semibold text-amber-200">
              {((probe.specificExtractionRate * 1800) / 1000).toFixed(1)}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">
                kWh/(m·a)
              </span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
            Nach VDI 4640 (1.800 h/a)
          </div>
        </div>
      </div>

      {/* Total Annual Yield */}
      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
        <div>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
            Voraussichtlicher Jahresertrag (100 m)
          </div>
          <div className="text-sm font-mono font-bold text-emerald-200 mt-0.5">
            ca. {probe.totalAnnualYieldKwh.toLocaleString('de-DE')} kWh/a
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">
          Sehr gut geeignet
        </span>
      </div>

      {/* Vertical Stratigraphic Profile (0-100m) */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Bohrprofil 0 bis 100 m
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {strata.length} Formationen
          </span>
        </div>

        {/* Visual Bar */}
        <div className="flex h-4 w-full rounded-md overflow-hidden border border-slate-700 bg-slate-900">
          {strata.map((s, idx) => {
            const widthPct = ((s.to - s.from) / 100) * 100;
            return (
              <div
                key={idx}
                style={{ width: `${widthPct}%`, backgroundColor: s.color }}
                title={`${s.lithology} (${s.from}–${s.to}m): λ=${s.lambda} W/(m·K)`}
                className="h-full border-r border-slate-900/40 last:border-0 hover:opacity-80 transition-opacity"
              />
            );
          })}
        </div>

        {/* Stratum List */}
        <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] pr-1">
          {strata.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-1.5 rounded bg-slate-900/70 border border-slate-800/80"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-slate-300">{s.lithology}</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                {s.from}–{s.to} m ({s.lambda} W/mK)
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Klicke auf eine beliebige Stelle der Karte, um eine neue Sonde zu setzen.</span>
      </div>
    </div>
  );
};
