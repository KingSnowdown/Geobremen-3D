import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Scissors,
  Sliders,
  Thermometer,
  Waves,
} from 'lucide-react';
import { ClippingSettings, InterpolationSettings, ViewMode } from '../types/geology';

interface ControlDockProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  settings: InterpolationSettings;
  onUpdateSettings: (newSettings: Partial<InterpolationSettings>) => void;
  clipping: ClippingSettings;
  onUpdateClipping: (newClipping: Partial<ClippingSettings>) => void;
  minZ: number;
  maxZ: number;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  viewMode,
  onChangeViewMode,
  settings,
  onUpdateSettings,
  clipping,
  onUpdateClipping,
  minZ,
  maxZ,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'mode' | 'slicing' | 'idw'>('mode');

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[min(940px,96vw)] w-full">
      {/* Collapse / Expand Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-1.5 px-3 h-7 rounded-t-md bg-[#121318]/95 hover:bg-[#181a20] text-zinc-400 hover:text-zinc-200 border-t border-x border-white/[0.08] backdrop-blur-md text-[11px] font-medium cursor-pointer transition-colors"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>Steuerung einblenden</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>Kompakt</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      {!isCollapsed && (
        <div className="w-full bg-[#101115]/95 backdrop-blur-md border border-white/[0.08] rounded-xl p-4 text-zinc-200 space-y-3.5 shadow-xl">
          {/* Top Bar: View Mode Selector & Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            {/* View Mode Segmented Control */}
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
              <button
                onClick={() => onChangeViewMode('lithology')}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs transition-colors ${
                  viewMode === 'lithology'
                    ? 'bg-white/[0.12] text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Lithologie (DIN 4023)</span>
              </button>

              <button
                onClick={() => onChangeViewMode('lambda')}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs transition-colors ${
                  viewMode === 'lambda'
                    ? 'bg-white/[0.12] text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Wärmeleitfähigkeit λ</span>
              </button>

              <button
                onClick={() => onChangeViewMode('kf')}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-md text-xs transition-colors ${
                  viewMode === 'kf'
                    ? 'bg-white/[0.12] text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Waves className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Durchlässigkeit kf</span>
              </button>
            </div>

            {/* Navigation Tabs for parameter panels */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveTab('mode')}
                className={`px-3 h-7 rounded-md transition-colors ${
                  activeTab === 'mode'
                    ? 'bg-white/[0.08] text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Geometrie & Maßstab
              </button>

              <button
                onClick={() => setActiveTab('slicing')}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-md transition-colors ${
                  activeTab === 'slicing'
                    ? 'bg-white/[0.08] text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Scissors className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Profilschnitt</span>
                {clipping.enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('idw')}
                className={`px-3 h-7 rounded-md transition-colors ${
                  activeTab === 'idw'
                    ? 'bg-white/[0.08] text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                IDW-Interpolation
              </button>
            </div>
          </div>

          {/* Tab 1: Scale & Geometry */}
          {activeTab === 'mode' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-0.5">
              {/* Z-Exaggeration */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Z-Überhöhung</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {settings.zExaggeration}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={settings.zExaggeration}
                  onChange={(e) =>
                    onUpdateSettings({ zExaggeration: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>1x (Real)</span>
                  <span>8x (Empfohlen)</span>
                  <span>30x</span>
                </div>
              </div>

              {/* Map Elevation */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Kartenhöhe</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {(settings.mapElevationM ?? 3.0) > 0
                      ? `+${(settings.mapElevationM ?? 3.0).toFixed(1)}`
                      : (settings.mapElevationM ?? 3.0).toFixed(1)}{' '}
                    m NHN
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="15"
                  step="0.5"
                  value={settings.mapElevationM ?? 3.0}
                  onChange={(e) =>
                    onUpdateSettings({ mapElevationM: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>-10 m</span>
                  <span>+3.0 m (Gelände)</span>
                  <span>+15 m</span>
                </div>
              </div>

              {/* Borehole Radius */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Bohrloch-Radius</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {settings.boreholeRadius.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={settings.boreholeRadius}
                  onChange={(e) =>
                    onUpdateSettings({ boreholeRadius: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>1.0 m</span>
                  <span>3.5 m</span>
                  <span>12.0 m</span>
                </div>
              </div>

              {/* Voxel Opacity */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Voxel-Deckkraft</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {Math.round(settings.voxelOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.voxelOpacity}
                  onChange={(e) =>
                    onUpdateSettings({ voxelOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>10% (Transparent)</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Interactive 3D Slicing */}
          {activeTab === 'slicing' && (
            <div className="space-y-3 text-xs pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium">
                  Geologische Schnittfilter
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={clipping.enabled}
                    onChange={(e) => onUpdateClipping({ enabled: e.target.checked })}
                    className="rounded accent-zinc-200 bg-white/[0.1]"
                  />
                  <span>Schnitt aktivieren</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* X Cut */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-zinc-400">West ↔ Ost</span>
                    <span className="font-mono text-zinc-300 tabular-nums">
                      {clipping.maxXPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="2"
                    value={clipping.maxXPercent}
                    onChange={(e) =>
                      onUpdateClipping({
                        enabled: true,
                        maxXPercent: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Östliche Begrenzung
                  </div>
                </div>

                {/* Y Cut */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-zinc-400">Süd ↔ Nord</span>
                    <span className="font-mono text-zinc-300 tabular-nums">
                      {clipping.maxYPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="2"
                    value={clipping.maxYPercent}
                    onChange={(e) =>
                      onUpdateClipping({
                        enabled: true,
                        maxYPercent: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Nördliche Begrenzung
                  </div>
                </div>

                {/* Z Cut */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-zinc-400">Tiefenbegrenzung</span>
                    <span className="font-mono text-zinc-300 tabular-nums">
                      {clipping.maxDepthZ} m NHN
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.floor(minZ)}
                    max={Math.ceil(maxZ)}
                    step="1"
                    value={clipping.maxDepthZ}
                    onChange={(e) =>
                      onUpdateClipping({
                        enabled: true,
                        maxDepthZ: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Horizontale Schnitttiefe
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: IDW Parameters */}
          {activeTab === 'idw' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-0.5">
              {/* IDW Exponent */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Gewichtungsexponent (p)</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {settings.idwExponent.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.2"
                  value={settings.idwExponent}
                  onChange={(e) =>
                    onUpdateSettings({ idwExponent: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>1.0 (Regional)</span>
                  <span>2.0 (Standard)</span>
                  <span>5.0 (Punktuell)</span>
                </div>
              </div>

              {/* Grid Resolution */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Horizontale Rasterteilung</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {settings.gridResolutionXY} Zellen
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="55"
                  step="5"
                  value={settings.gridResolutionXY}
                  onChange={(e) =>
                    onUpdateSettings({
                      gridResolutionXY: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>20 (Schnell)</span>
                  <span>35</span>
                  <span>55 (Detail)</span>
                </div>
              </div>

              {/* Slice Thickness */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-zinc-400">Tiefenauflösung (ΔZ)</span>
                  <span className="font-mono text-zinc-200 font-medium tabular-nums">
                    {settings.sliceThicknessZ.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={settings.sliceThicknessZ}
                  onChange={(e) =>
                    onUpdateSettings({
                      sliceThicknessZ: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-white/[0.1] accent-zinc-200 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>1.0 m</span>
                  <span>2.0 m</span>
                  <span>5.0 m</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
