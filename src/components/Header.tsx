import React from 'react';
import {
  Camera,
  Download,
  Layers,
  MapPin,
  Sliders,
} from 'lucide-react';

import { Borehole } from '../types/geology';
import { BoreholeSearch } from './BoreholeSearch';

interface HeaderProps {
  onTakeScreenshot: () => void;
  onExportArcGisCsv: () => void;
  onOpenParams: () => void;
  boreholeCount: number;
  layerCount: number;
  boreholes?: Borehole[];
  selectedBorehole?: Borehole | null;
  onSelectBorehole?: (bh: Borehole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onTakeScreenshot,
  onExportArcGisCsv,
  onOpenParams,
  boreholeCount,
  layerCount,
  boreholes = [],
  selectedBorehole = null,
  onSelectBorehole,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4 bg-[#0d0e12]/90 backdrop-blur-md border-b border-white/[0.08] text-zinc-200 select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] text-zinc-300">
          <Layers className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
              GeoBremen 3D
            </h1>
            <span className="px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 bg-white/[0.05] border border-white/[0.08] rounded">
              VDI 4640 · DIN 4023
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Quartärgeologisches Untergrund- & Geothermiemodell Bremen
          </p>
        </div>
      </div>

      {/* Central Borehole Search: Only shown when data is loaded */}
      {boreholeCount > 0 && onSelectBorehole && (
        <div className="flex-1 max-w-sm mx-4 hidden md:flex justify-center">
          <BoreholeSearch
            boreholes={boreholes}
            selectedBorehole={selectedBorehole}
            onSelectBorehole={onSelectBorehole}
            variant="header"
          />
        </div>
      )}

      {/* Meta Indicators & Primary Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-zinc-400">
          <MapPin className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
          <span>EPSG:25832</span>
          <span className="text-zinc-600">/</span>
          {boreholeCount > 0 ? (
            <>
              <span className="text-zinc-300 tabular-nums">{boreholeCount} Bohrungen</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400 tabular-nums">{layerCount} Schichten</span>
            </>
          ) : (
            <span className="text-zinc-500">Keine Daten geladen</span>
          )}
        </div>

        <button
          onClick={onOpenParams}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
          title="Wärmeleitfähigkeiten (λ-Werte) anpassen"
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
          <span className="hidden sm:inline">λ-Parameter</span>
        </button>

        <button
          onClick={onExportArcGisCsv}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
          title="Rasterdaten für ArcGIS Pro / QGIS exportieren"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
          <span className="hidden sm:inline">GIS Export</span>
        </button>

        <button
          onClick={onTakeScreenshot}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors"
          title="3D-Ansicht als Bild speichern"
        >
          <Camera className="w-3.5 h-3.5 text-zinc-900" strokeWidth={1.5} />
          <span>Screenshot</span>
        </button>
      </div>
    </header>
  );
};
