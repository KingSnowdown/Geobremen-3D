import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Map as MapIcon,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react';
import { HauptbodenartType } from '../types/geology';
import { LITHOLOGY_CONFIG } from '../utils/geothermal';
import { MapTileStyle } from '../utils/mapTiles';

import { Borehole } from '../types/geology';
import { BoreholeSearch } from './BoreholeSearch';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onFileUpload: (files: FileList | File[], append?: boolean) => void;
  onLoadDemoData: () => void;
  onClearData: () => void;
  stats: {
    boreholeCount: number;
    layerCount: number;
    maxDepth: number;
    areaKm2: number;
    minZ: number;
    maxZ: number;
    maxCollar: number;
  };
  boreholes?: Borehole[];
  selectedBorehole?: Borehole | null;
  onSelectBorehole?: (bh: Borehole) => void;
  mapOpacity: number;
  onChangeMapOpacity: (val: number) => void;
  mapElevationM: number;
  onChangeMapElevationM: (val: number) => void;
  showMap: boolean;
  onToggleMap: () => void;
  mapStyle: MapTileStyle;
  onChangeMapStyle: (style: MapTileStyle) => void;
  activeLithologies: Set<HauptbodenartType>;
  onToggleLithology: (lith: HauptbodenartType) => void;
  onSelectAllLithologies: () => void;
  onSelectAquifersOnly: () => void;
  onSelectAquitardsOnly: () => void;
  showVoxels: boolean;
  onToggleVoxels: () => void;
  showBoreholes: boolean;
  onToggleBoreholes: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  onFileUpload,
  onLoadDemoData,
  onClearData,
  stats,
  boreholes = [],
  selectedBorehole = null,
  onSelectBorehole,
  mapOpacity,
  onChangeMapOpacity,
  mapElevationM,
  onChangeMapElevationM,
  showMap,
  onToggleMap,
  mapStyle,
  onChangeMapStyle,
  activeLithologies,
  onToggleLithology,
  onSelectAllLithologies,
  onSelectAquifersOnly,
  onSelectAquitardsOnly,
  showVoxels,
  onToggleVoxels,
  showBoreholes,
  onToggleBoreholes,
}) => {
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files, false);
      e.target.value = '';
    }
  };

  const handleAppendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files, true);
      e.target.value = '';
    }
  };

  const allLithologies = Object.keys(LITHOLOGY_CONFIG) as HauptbodenartType[];

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute top-18 left-4 z-20 flex items-center gap-2 h-9 px-3 rounded-lg bg-[#101115]/95 hover:bg-[#18191f] text-zinc-300 border border-white/[0.08] backdrop-blur-md text-xs font-medium transition-colors shadow-lg"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
          <span>Daten & Layer</span>
          <ChevronRight className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
        </button>
      )}

      {/* Main Drawer */}
      <aside
        className={`absolute top-14 bottom-0 left-0 z-20 w-80 bg-[#101115]/98 backdrop-blur-md border-r border-white/[0.08] flex flex-col text-zinc-200 transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            <h2 className="text-xs font-medium text-zinc-200">
              Daten & Ebenen
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            title="Schließen"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Section 1: Data Manager */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between text-zinc-300 font-medium">
              <span>Bohrdaten Import</span>
              <span className="text-[10px] text-zinc-500 font-mono">CSV / XLSX</span>
            </div>

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={replaceFileInputRef}
              onChange={handleReplaceChange}
              accept=".csv,.xlsx,.xls"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={appendFileInputRef}
              onChange={handleAppendChange}
              accept=".csv,.xlsx,.xls"
              multiple
              className="hidden"
            />

            {/* Upload Buttons */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => replaceFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] font-medium transition-colors"
                  title="Neue CSV/Excel-Datei laden (ersetzt bestehende Daten)"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                  <span>Datei laden</span>
                </button>

                <button
                  onClick={onLoadDemoData}
                  className="flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-white/[0.06] font-medium transition-colors"
                  title="Vollständigen Demo-Datensatz für Bremen laden (179 Bohrungen, 1.920 Schichten)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                  <span>Demo Bremen</span>
                </button>
              </div>

              {/* Add / Append Dataset button */}
              <button
                onClick={() => appendFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 border border-white/[0.06] text-[11px] transition-colors"
                title="Zweiten Datensatz aus einer weiteren Excel/CSV hinzufügen und zusammenführen"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Datensatz hinzufügen (Excel / CSV)</span>
              </button>
            </div>

            {/* Statistics or Empty Notice */}
            {stats.boreholeCount === 0 ? (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center space-y-1.5">
                <div className="text-zinc-300 font-medium text-xs">
                  Keine Bohrdaten geladen
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Lade eine eigene Excel/CSV-Datei hoch oder starte mit den Testdaten über <strong className="text-zinc-300">„Demo Bremen“</strong>.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-medium text-zinc-400">
                    Modell-Übersicht
                  </div>
                  <button
                    onClick={onClearData}
                    className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400 transition-colors"
                    title="Alle geladenen Bohrungen leeren"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    <span>Leeren</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-white/[0.03] border border-white/[0.04]">
                    <div className="text-zinc-500 text-[10px]">Bohrungen</div>
                    <div className="text-zinc-100 font-semibold text-sm tabular-nums">
                      {stats.boreholeCount}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03] border border-white/[0.04]">
                    <div className="text-zinc-500 text-[10px]">Schichten</div>
                    <div className="text-zinc-100 font-semibold text-sm tabular-nums">
                      {stats.layerCount}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03] border border-white/[0.04]">
                    <div className="text-zinc-500 text-[10px]">Max. Tiefe</div>
                    <div className="text-zinc-100 font-semibold text-sm tabular-nums">
                      {stats.maxDepth.toFixed(1)} m
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03] border border-white/[0.04]">
                    <div className="text-zinc-500 text-[10px]">Fläche</div>
                    <div className="text-zinc-100 font-semibold text-sm tabular-nums">
                      {stats.areaKm2.toFixed(2)} km²
                    </div>
                  </div>
                </div>

                {/* Borehole Search by designation */}
                {boreholes.length > 0 && onSelectBorehole && (
                  <div className="pt-1.5 border-t border-white/[0.04]">
                    <div className="text-[11px] text-zinc-400 mb-1.5 font-medium">
                      Bohrung per Bezeichnung suchen
                    </div>
                    <BoreholeSearch
                      boreholes={boreholes}
                      selectedBorehole={selectedBorehole}
                      onSelectBorehole={onSelectBorehole}
                      variant="sidebar"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 2: 3D Object Visibility */}
          <section className="space-y-2.5 pt-3 border-t border-white/[0.06]">
            <div className="text-zinc-300 font-medium">3D-Sichtbarkeit</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleBoreholes}
                className={`flex items-center justify-between h-8 px-2.5 rounded-md border text-xs transition-colors ${
                  showBoreholes
                    ? 'bg-white/[0.1] border-white/[0.15] text-zinc-100 font-medium'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
                }`}
              >
                <span>Bohrungen</span>
                {showBoreholes ? (
                  <Eye className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.5} />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.5} />
                )}
              </button>

              <button
                onClick={onToggleVoxels}
                className={`flex items-center justify-between h-8 px-2.5 rounded-md border text-xs transition-colors ${
                  showVoxels
                    ? 'bg-white/[0.1] border-white/[0.15] text-zinc-100 font-medium'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
                }`}
              >
                <span>Voxel-Volumen</span>
                {showVoxels ? (
                  <Eye className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.5} />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </section>

          {/* Section 3: Map Controls */}
          <section className="space-y-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <MapIcon className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Grundkarte</span>
              </div>
              <button
                onClick={onToggleMap}
                className={`p-1 rounded text-xs transition-colors ${
                  showMap ? 'text-zinc-200 bg-white/[0.1]' : 'text-zinc-500 bg-white/[0.02]'
                }`}
              >
                {showMap ? (
                  <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {showMap && (
              <div className="space-y-3">
                {/* Map Elevation Slider */}
                <div>
                  <div className="flex justify-between text-zinc-400 text-[11px] mb-1">
                    <span>Kartenhöhe (Geländekante)</span>
                    <span className="font-mono text-zinc-200 font-medium tabular-nums">
                      {mapElevationM > 0 ? `+${mapElevationM.toFixed(1)}` : mapElevationM.toFixed(1)} m NHN
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="15"
                    step="0.5"
                    value={mapElevationM}
                    onChange={(e) => onChangeMapElevationM(parseFloat(e.target.value))}
                    className="w-full accent-zinc-200 h-1 bg-white/[0.1] rounded cursor-pointer"
                  />
                  <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                    <button
                      onClick={() => onChangeMapElevationM(stats.maxCollar || 3.0)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]"
                    >
                      Gelände ({stats.maxCollar || 3.0}m)
                    </button>
                    <button
                      onClick={() => onChangeMapElevationM(0.0)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border border-white/[0.08]"
                    >
                      0 m NHN
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 text-[11px] mb-1">
                    <span>Deckkraft</span>
                    <span className="font-mono text-zinc-200 tabular-nums">{Math.round(mapOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={mapOpacity}
                    onChange={(e) => onChangeMapOpacity(parseFloat(e.target.value))}
                    className="w-full accent-zinc-200 h-1 bg-white/[0.1] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="text-zinc-400 text-[11px] mb-1.5">Kartentyp</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onChangeMapStyle('esri-streets')}
                      className={`h-7 px-2 rounded text-[11px] text-left border transition-colors flex items-center justify-between ${
                        mapStyle === 'esri-streets'
                          ? 'bg-white/[0.12] border-white/[0.18] text-zinc-100 font-medium'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>Esri Straßen</span>
                      <span className="text-[9px] font-mono text-zinc-500">HD</span>
                    </button>
                    <button
                      onClick={() => onChangeMapStyle('osm')}
                      className={`h-7 px-2 rounded text-[11px] text-left border transition-colors flex items-center justify-between ${
                        mapStyle === 'osm'
                          ? 'bg-white/[0.12] border-white/[0.18] text-zinc-100 font-medium'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>OSM Standard</span>
                      <span className="text-[9px] font-mono text-zinc-500">HD</span>
                    </button>
                    <button
                      onClick={() => onChangeMapStyle('esri-topo')}
                      className={`h-7 px-2 rounded text-[11px] text-left border transition-colors flex items-center justify-between ${
                        mapStyle === 'esri-topo'
                          ? 'bg-white/[0.12] border-white/[0.18] text-zinc-100 font-medium'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>Esri Topo</span>
                      <span className="text-[9px] font-mono text-zinc-500">Relief</span>
                    </button>
                    <button
                      onClick={() => onChangeMapStyle('esri-imagery')}
                      className={`h-7 px-2 rounded text-[11px] text-left border transition-colors flex items-center justify-between ${
                        mapStyle === 'esri-imagery'
                          ? 'bg-white/[0.12] border-white/[0.18] text-zinc-100 font-medium'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>Satellit</span>
                      <span className="text-[9px] font-mono text-zinc-500">Foto</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Lithology Filter */}
          <section className="space-y-2.5 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <Filter className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Lithologie-Filter</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                {activeLithologies.size}/{allLithologies.length}
              </span>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={onSelectAllLithologies}
                className="px-2 h-6 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[10px] border border-white/[0.06] transition-colors"
              >
                Alle
              </button>
              <button
                onClick={onSelectAquifersOnly}
                className="px-2 h-6 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[10px] border border-white/[0.06] transition-colors"
                title="Nur Grundwasserleiter: Sande & Kiese"
              >
                Leiter (Sand/Kies)
              </button>
              <button
                onClick={onSelectAquitardsOnly}
                className="px-2 h-6 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[10px] border border-white/[0.06] transition-colors"
                title="Nur Grundwasserstauer: Ton & Schluff"
              >
                Stauer (Ton/Schluff)
              </button>
            </div>

            {/* Checkbox list */}
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {allLithologies.map((lith) => {
                const conf = LITHOLOGY_CONFIG[lith];
                const isActive = activeLithologies.has(lith);
                return (
                  <label
                    key={lith}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/[0.04] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => onToggleLithology(lith)}
                        className="rounded accent-zinc-200 bg-white/[0.1] border-white/[0.2]"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                        style={{ backgroundColor: conf.color }}
                      />
                      <span className={isActive ? 'text-zinc-200' : 'text-zinc-500'}>
                        {lith}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                      {conf.defaultLambda.toFixed(1)} W/(m·K)
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
