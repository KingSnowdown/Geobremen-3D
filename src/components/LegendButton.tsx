import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Thermometer, Waves, X } from 'lucide-react';
import { ViewMode } from '../types/geology';
import {
  KF_COLORS,
  KF_NAMES,
  LAMBDA_GRADIENT_CSS,
  LITHOLOGY_CONFIG,
} from '../utils/geothermal';

interface LegendButtonProps {
  viewMode: ViewMode;
}

export const LegendButton: React.FC<LegendButtonProps> = ({ viewMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end select-none">
      {/* Expandable Popover Card */}
      {isOpen && (
        <div className="mb-2 w-72 sm:w-80 p-3.5 rounded-xl bg-[#101115]/98 backdrop-blur-md border border-white/[0.08] shadow-xl text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              {viewMode === 'lambda' && (
                <>
                  <Thermometer className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                  <span>Wärmeleitfähigkeit λ</span>
                </>
              )}
              {viewMode === 'lithology' && (
                <>
                  <Layers className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                  <span>Lithologie (DIN 4023)</span>
                </>
              )}
              {viewMode === 'kf' && (
                <>
                  <Waves className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                  <span>Durchlässigkeit kf</span>
                </>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Mode 1: Lambda Thermal Gradient Bar */}
          {viewMode === 'lambda' && (
            <div className="space-y-2.5">
              <div className="relative">
                {/* Continuous Thermal Bar with exact CSS linear gradient matching 3D voxels */}
                <div
                  className="h-3 w-full rounded border border-white/[0.12] shadow-inner"
                  style={{ background: LAMBDA_GRADIENT_CSS }}
                />

                {/* Ticks and numeric scale placed at exact mathematical percentage positions */}
                <div className="relative h-4 mt-1 font-mono text-[9px] text-zinc-400 tabular-nums">
                  <span className="absolute left-0">0.4</span>
                  <span
                    className="absolute -translate-x-1/2"
                    style={{ left: '30.8%' }}
                  >
                    1.2
                  </span>
                  <span
                    className="absolute -translate-x-1/2"
                    style={{ left: '53.8%' }}
                  >
                    1.8
                  </span>
                  <span
                    className="absolute -translate-x-1/2"
                    style={{ left: '76.9%' }}
                  >
                    2.4
                  </span>
                  <span className="absolute right-0">
                    ≥ 3.0 W/(m·K)
                  </span>
                </div>
              </div>

              {/* Exact calibrated lithology swatches matching the voxel volume colors */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#2563eb' }}
                  />
                  <span>0.4: Torf</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#06b6d4' }}
                  />
                  <span>1.2–1.5: Ton</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#10b981' }}
                  />
                  <span>1.8: Schluff</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#84cc16' }}
                  />
                  <span>2.2: Feinsand</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#eab308' }}
                  />
                  <span>2.4: Mittelsand</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#f97316' }}
                  />
                  <span>2.6: Grobsand</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300 col-span-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: '#dc2626' }}
                  />
                  <span>≥ 2.8: Kies / Steine (sehr hohe Leitfähigkeit)</span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Lithology DIN 4023 Swatches */}
          {viewMode === 'lithology' && (
            <div className="grid grid-cols-2 gap-1.5 text-[10px] max-h-48 overflow-y-auto pr-1">
              {Object.entries(LITHOLOGY_CONFIG).map(([name, conf]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm shrink-0 border border-white/20"
                    style={{ backgroundColor: conf.color }}
                  />
                  <span className="truncate text-zinc-300">{name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mode 3: kf Classes */}
          {viewMode === 'kf' && (
            <div className="space-y-1 text-[10px]">
              {Object.entries(KF_NAMES).map(([cls, name]) => (
                <div key={cls} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: KF_COLORS[parseInt(cls, 10)] }}
                  />
                  <span className="text-zinc-300">{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 px-3 rounded-md bg-[#101115]/95 hover:bg-[#18191f] text-zinc-300 border border-white/[0.08] shadow-lg backdrop-blur-md text-xs font-medium cursor-pointer transition-colors"
      >
        {viewMode === 'lambda' && (
          <>
            <span
              className="w-2.5 h-2.5 rounded-sm border border-white/20"
              style={{ background: LAMBDA_GRADIENT_CSS }}
            />
            <span>Wärmeskala λ</span>
          </>
        )}
        {viewMode === 'lithology' && (
          <>
            <Layers className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>DIN 4023 Legende</span>
          </>
        )}
        {viewMode === 'kf' && (
          <>
            <Waves className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>kf-Legende</span>
          </>
        )}

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
};
