import React, { useState } from 'react';
import {
  Activity,
  Database,
  Info,
  Layers,
  MapPin,
  X,
  Zap,
} from 'lucide-react';
import {
  Borehole,
  BoreholeLayer,
  GeothermalProbeResult,
  ViewMode,
} from '../types/geology';
import {
  KF_COLORS,
  LITHOLOGY_CONFIG,
  getLambdaColor,
} from '../utils/geothermal';
import { utm32ToWgs84 } from '../utils/coordinates';

interface BoreholeInspectorProps {
  selectedBorehole: Borehole | null;
  probe: GeothermalProbeResult | null;
  viewMode: ViewMode;
  onClose: () => void;
  onSelectLayerHover?: (layer: BoreholeLayer | null) => void;
}

export const BoreholeInspector: React.FC<BoreholeInspectorProps> = ({
  selectedBorehole,
  probe,
  viewMode,
  onClose,
  onSelectLayerHover,
}) => {
  if (!selectedBorehole && !probe) return null;

  const [activeTab, setActiveTab] = useState<'layers' | 'geothermal'>(
    selectedBorehole ? 'layers' : 'geothermal'
  );

  const easting = selectedBorehole ? selectedBorehole.eastingX : probe?.x ?? 0;
  const northing = selectedBorehole ? selectedBorehole.northingY : probe?.y ?? 0;
  const [lon, lat] = utm32ToWgs84(easting, northing);

  return (
    <div className="absolute top-18 right-4 z-20 w-88 sm:w-96 max-h-[calc(100vh-88px)] flex flex-col bg-[#101115]/98 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-xl p-4 text-zinc-200 select-none">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-300">
            {selectedBorehole ? (
              <Database className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            ) : (
              <Activity className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100">
                {selectedBorehole ? selectedBorehole.name : 'Virtuelle Sonde'}
              </h3>
              {selectedBorehole && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/[0.05] text-zinc-400 border border-white/[0.08] font-mono tabular-nums">
                  {selectedBorehole.layers.length} Schichten
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">
              {selectedBorehole ? selectedBorehole.project : 'Koordinatenmessung'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          title="Schließen"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Coordinate & Collar Elevation Strip */}
      <div className="mt-2.5 p-2 rounded-md bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-zinc-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" strokeWidth={1.5} />
          <span className="tabular-nums">
            {easting.toFixed(0)} E / {northing.toFixed(0)} N
          </span>
        </div>
        <div>
          Ansatz:{' '}
          <span className="text-zinc-200 font-medium tabular-nums">
            {selectedBorehole ? selectedBorehole.collarElevation.toFixed(2) : '3.00'} m NHN
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      {selectedBorehole && (
        <div className="flex items-center gap-1 mt-2.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md transition-colors ${
              activeTab === 'layers'
                ? 'bg-white/[0.12] text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>Bohrprofil ({selectedBorehole.layers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('geothermal')}
            className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md transition-colors ${
              activeTab === 'geothermal'
                ? 'bg-white/[0.12] text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>VDI 4640 Sondenpotenzial</span>
          </button>
        </div>
      )}

      {/* TAB 1: Real measured borehole layers */}
      {selectedBorehole && activeTab === 'layers' && (
        <div className="mt-2.5 flex-1 flex flex-col min-h-0 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
            <span>Schichtprofil nach Teufe & NHN</span>
            <span className="font-mono text-zinc-400 tabular-nums">
              0 bis {selectedBorehole.maxDepth.toFixed(1)} m
            </span>
          </div>

          {/* Visual Strata Bar */}
          <div className="flex h-3 w-full rounded overflow-hidden border border-white/[0.1] bg-white/[0.03] shrink-0">
            {selectedBorehole.layers.map((l, idx) => {
              const widthPct = Math.max(
                1.5,
                (l.thickness / selectedBorehole.maxDepth) * 100
              );
              let col = LITHOLOGY_CONFIG[l.lithology]?.color || '#94a3b8';
              if (viewMode === 'lambda') col = getLambdaColor(l.lambda);
              else if (viewMode === 'kf') col = KF_COLORS[l.kfClass] || '#64748b';

              return (
                <div
                  key={idx}
                  style={{ width: `${widthPct}%`, backgroundColor: col }}
                  title={`${l.lithology} (${l.depthFrom}–${l.depthTo} m | ${l.zTop} bis ${l.zBottom} m NHN)`}
                  className="h-full border-r border-[#101115] last:border-0 hover:opacity-80 transition-opacity"
                />
              );
            })}
          </div>

          {/* Scrollable Layer List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {selectedBorehole.layers.map((layer, idx) => {
              const conf = LITHOLOGY_CONFIG[layer.lithology];
              let activeColor = conf?.color || '#94a3b8';
              if (viewMode === 'lambda') activeColor = getLambdaColor(layer.lambda);
              else if (viewMode === 'kf') activeColor = KF_COLORS[layer.kfClass] || '#64748b';

              return (
                <div
                  key={layer.id || idx}
                  onMouseEnter={() => onSelectLayerHover?.(layer)}
                  onMouseLeave={() => onSelectLayerHover?.(null)}
                  className="p-2 rounded-md bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                        style={{ backgroundColor: activeColor }}
                      />
                      <span className="font-medium text-zinc-100">
                        {layer.lithology}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-zinc-200 tabular-nums">
                        λ = {layer.lambda.toFixed(2)} W/(m·K)
                      </span>
                    </div>
                  </div>

                  {/* Depths & Elevation */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pl-4.5">
                    <div>
                      Teufe: <span className="text-zinc-300 tabular-nums">{layer.depthFrom.toFixed(2)} – {layer.depthTo.toFixed(2)} m</span>
                    </div>
                    <div>
                      Z: <span className="text-zinc-300 tabular-nums">{layer.zTop.toFixed(2)} bis {layer.zBottom.toFixed(2)} m</span>
                    </div>
                  </div>

                  {/* Petrographic Detail Description */}
                  {layer.descriptionDetail && (
                    <div className="text-[10px] text-zinc-400 pl-4.5 line-clamp-2">
                      {layer.descriptionDetail}
                    </div>
                  )}

                  {/* kf value indicator */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pl-4.5 pt-0.5 border-t border-white/[0.04]">
                    <span>kf-Klasse (HKA 1997):</span>
                    <span className="font-mono text-zinc-400">
                      {layer.kfRaw !== '—' && layer.kfRaw !== ''
                        ? layer.kfRaw
                        : 'Keine Angabe'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Geothermal Probe Potential (VDI 4640) */}
      {(!selectedBorehole || activeTab === 'geothermal') && probe && (
        <div className="mt-2.5 space-y-2.5 overflow-y-auto">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 gap-2 font-mono">
            {/* Mean Lambda */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 font-sans">
                Mittlere Leitfähigkeit
              </div>
              <div className="text-lg font-semibold text-zinc-100 mt-0.5 tabular-nums">
                {probe.meanLambda.toFixed(2)}
                <span className="text-xs font-normal text-zinc-400 ml-1">
                  W/(m·K)
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                0–100 m gewichtet
              </div>
            </div>

            {/* Specific Extraction Rate */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[10px] text-zinc-500 font-sans">
                Spez. Entzugsleistung
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                <span className="text-lg font-semibold text-zinc-100 tabular-nums">
                  {probe.specificExtractionRate.toFixed(1)}
                  <span className="text-xs font-normal text-zinc-400 ml-1">
                    W/m
                  </span>
                </span>
                <span className="text-xs text-zinc-500 font-sans">·</span>
                <span className="text-sm font-semibold text-zinc-200 tabular-nums">
                  {((probe.specificExtractionRate * 1800) / 1000).toFixed(1)}
                  <span className="text-[10px] font-normal text-zinc-400 ml-0.5">
                    kWh/(m·a)
                  </span>
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                VDI 4640 (1.800 h/a)
              </div>
            </div>
          </div>

          {/* Annual Energy Yield */}
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-zinc-500">
                Jahresertrag (100 m Erdsonde)
              </div>
              <div className="text-sm font-mono font-semibold text-zinc-100 mt-0.5 tabular-nums">
                {probe.totalAnnualYieldKwh.toLocaleString('de-DE')} kWh/a
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium text-zinc-300 bg-white/[0.05] border border-white/[0.08]">
              Gut geeignet
            </span>
          </div>

          {/* Info Note */}
          <div className="text-[11px] text-zinc-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04] space-y-1">
            <div className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
              <span>VDI 4640 Blatt 2 Richtwerte</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Für flache Erdwärmesonden in Bremen (wassergesättigte quartäre Sande und Kiese)
              liegt die spezifische Entzugsleistung im Bereich 45 bis 70 W/m (ca. 80 bis 125 kWh/(m·a) bei 1.800 h/a).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
