import React from 'react';
import { BoreholeLayer } from '../types/geology';
import { KF_COLORS, LITHOLOGY_CONFIG } from '../utils/geothermal';

interface LayerTooltipProps {
  layer: BoreholeLayer | null;
  position?: { x: number; y: number };
}

export const LayerTooltip: React.FC<LayerTooltipProps> = ({ layer, position }) => {
  if (!layer || !position) return null;

  const lithConfig = LITHOLOGY_CONFIG[layer.lithology];
  const kfColor = KF_COLORS[layer.kfClass] || '#64748b';

  return (
    <div
      style={{
        left: `${Math.min(window.innerWidth - 300, position.x + 16)}px`,
        top: `${Math.min(window.innerHeight - 260, position.y + 16)}px`,
      }}
      className="pointer-events-none fixed z-50 w-72 rounded-lg bg-[#101115]/98 p-3 text-xs text-zinc-200 shadow-xl border border-white/[0.1] backdrop-blur-md space-y-2 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
        <div>
          <div className="font-mono font-semibold text-zinc-100 text-xs">
            {layer.boreholeName}
          </div>
          <div className="text-[10px] text-zinc-400 truncate max-w-[200px]">
            {layer.project}
          </div>
        </div>
        <span
          className="w-2.5 h-2.5 rounded-sm border border-white/20 shrink-0"
          style={{ backgroundColor: lithConfig?.color || '#94a3b8' }}
        />
      </div>

      {/* Lithology & Conductivity */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-white/[0.03] border border-white/[0.04]">
          <div className="text-[10px] text-zinc-500">Bodenart</div>
          <div className="font-medium text-zinc-100 mt-0.5">{layer.lithology}</div>
        </div>
        <div className="p-2 rounded bg-white/[0.03] border border-white/[0.04]">
          <div className="text-[10px] text-zinc-500">Wärmeleitfähigkeit λ</div>
          <div className="font-mono font-semibold text-zinc-100 mt-0.5 tabular-nums">
            {layer.lambda.toFixed(2)}{' '}
            <span className="text-[10px] font-normal text-zinc-500">W/(m·K)</span>
          </div>
        </div>
      </div>

      {/* Depths */}
      <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-zinc-400 bg-white/[0.02] p-2 rounded border border-white/[0.04] tabular-nums">
        <div>
          <span className="text-zinc-500">Tiefe: </span>
          {layer.depthFrom.toFixed(2)}–{layer.depthTo.toFixed(2)} m
        </div>
        <div>
          <span className="text-zinc-500">Dicke: </span>
          {layer.thickness.toFixed(2)} m
        </div>
        <div>
          <span className="text-zinc-500">Z-Oben: </span>
          {layer.zTop.toFixed(2)} m
        </div>
        <div>
          <span className="text-zinc-500">Z-Unten: </span>
          {layer.zBottom.toFixed(2)} m
        </div>
      </div>

      {/* Petrographic Detail */}
      {layer.descriptionDetail && (
        <div className="text-[10px] text-zinc-400 bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
          <span className="text-zinc-500 block">Detailbeschreibung:</span>
          <span className="italic">{layer.descriptionDetail}</span>
        </div>
      )}

      {/* kf Value */}
      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/[0.06]">
        <span className="text-zinc-500">Durchlässigkeit (kf):</span>
        <span className="font-mono text-zinc-300">
          {layer.kfRaw !== '—' && layer.kfRaw !== '' ? layer.kfRaw : 'Keine Angabe'}
        </span>
      </div>
    </div>
  );
};
