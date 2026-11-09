import React, { useState } from 'react';
import { RotateCcw, Save, Sliders, X } from 'lucide-react';
import { HauptbodenartType } from '../types/geology';
import { LITHOLOGY_CONFIG } from '../utils/geothermal';

interface ParameterModalProps {
  isOpen: boolean;
  onClose: () => void;
  customLambdas: Partial<Record<HauptbodenartType, number>>;
  onSave: (newLambdas: Partial<Record<HauptbodenartType, number>>) => void;
  onReset: () => void;
}

export const ParameterModal: React.FC<ParameterModalProps> = ({
  isOpen,
  onClose,
  customLambdas,
  onSave,
  onReset,
}) => {
  if (!isOpen) return null;

  const [formValues, setFormValues] = useState<
    Partial<Record<HauptbodenartType, number>>
  >({ ...customLambdas });

  const lithologies = Object.keys(LITHOLOGY_CONFIG) as HauptbodenartType[];

  const handleChange = (lith: HauptbodenartType, val: number) => {
    setFormValues((prev) => ({
      ...prev,
      [lith]: val,
    }));
  };

  const handleSave = () => {
    onSave(formValues);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg bg-[#101115] border border-white/[0.08] rounded-xl shadow-2xl p-5 text-zinc-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-300">
              <Sliders className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Wärmeleitfähigkeiten (λ-Werte)
              </h3>
              <p className="text-xs text-zinc-400">
                VDI 4640 Blatt 1 Richtwerte für wassergesättigte Sedimente in Bremen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-[55vh] overflow-y-auto space-y-1.5 pr-1 text-xs">
          {lithologies
            .filter((l) => l !== 'Leerschicht / keine Angabe')
            .map((lith) => {
              const conf = LITHOLOGY_CONFIG[lith];
              const curVal = formValues[lith] ?? conf.defaultLambda;

              return (
                <div
                  key={lith}
                  className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
                      style={{ backgroundColor: conf.color }}
                    />
                    <div>
                      <div className="font-medium text-zinc-200">{lith}</div>
                      <div className="text-[10px] text-zinc-500">
                        {conf.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      max="4.0"
                      value={curVal}
                      onChange={(e) =>
                        handleChange(lith, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-right text-zinc-100 tabular-nums focus:outline-none focus:border-white/[0.3]"
                    />
                    <span className="font-mono text-zinc-500 text-[11px]">
                      W/(m·K)
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
          <button
            onClick={() => {
              onReset();
              setFormValues({});
            }}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>VDI 4640 zurücksetzen</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 h-8 rounded-md bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-white/[0.06] transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 h-8 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Speichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
