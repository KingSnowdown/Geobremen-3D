import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Layers, ArrowRight } from 'lucide-react';
import { Borehole } from '../types/geology';

interface BoreholeSearchProps {
  boreholes: Borehole[];
  selectedBorehole: Borehole | null;
  onSelectBorehole: (bh: Borehole) => void;
  className?: string;
  variant?: 'header' | 'sidebar';
}

export const BoreholeSearch: React.FC<BoreholeSearchProps> = ({
  boreholes,
  selectedBorehole,
  onSelectBorehole,
  className = '',
  variant = 'header',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter boreholes matching query by name, ID or project
  const filteredBoreholes = useMemo(() => {
    if (!query.trim()) return boreholes.slice(0, 8);
    const q = query.toLowerCase().trim();
    return boreholes
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          (b.project && b.project.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [boreholes, query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredBoreholes.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? filteredBoreholes.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredBoreholes[selectedIndex]) {
        handleSelect(filteredBoreholes[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (bh: Borehole) => {
    onSelectBorehole(bh);
    setQuery(bh.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  if (boreholes.length === 0) {
    return null;
  }

  const isHeader = variant === 'header';

  return (
    <div
      ref={containerRef}
      className={`relative ${isHeader ? 'w-64 sm:w-80' : 'w-full'} ${className}`}
    >
      <div className="relative flex items-center">
        <Search
          className={`absolute left-2.5 w-3.5 h-3.5 pointer-events-none transition-colors ${
            isOpen ? 'text-zinc-200' : 'text-zinc-500'
          }`}
          strokeWidth={1.5}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Bohrung suchen (z. B. 2919_08_0977)..."
          className={`w-full pl-8 pr-7 text-xs text-zinc-100 placeholder-zinc-500 rounded-md bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/[0.08] focus:border-white/[0.22] outline-none transition-all ${
            isHeader ? 'h-8' : 'h-8'
          }`}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 p-0.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Suche leeren"
          >
            <X className="w-3 h-3" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 max-h-72 overflow-y-auto rounded-lg bg-[#101217] border border-white/[0.12] shadow-2xl backdrop-blur-md p-1 space-y-0.5 text-xs text-zinc-200">
          <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 flex items-center justify-between border-b border-white/[0.04] mb-1">
            <span>
              {query.trim()
                ? `${filteredBoreholes.length} Treffer für „${query}“`
                : `${boreholes.length} Bohrungen verfügbar`}
            </span>
            <span className="text-zinc-600">↑↓ zur Auswahl · ↵ Bestätigen</span>
          </div>

          {filteredBoreholes.length === 0 ? (
            <div className="px-3 py-3 text-center text-zinc-500 text-[11px]">
              Keine Bohrung mit dieser Bezeichnung gefunden.
            </div>
          ) : (
            filteredBoreholes.map((bh, idx) => {
              const isSelected =
                idx === selectedIndex ||
                (selectedBorehole && selectedBorehole.id === bh.id);

              return (
                <button
                  key={bh.id}
                  onClick={() => handleSelect(bh)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                    isSelected
                      ? 'bg-white/[0.1] text-zinc-100 font-medium'
                      : 'hover:bg-white/[0.04] text-zinc-300'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin
                        className={`w-3 h-3 shrink-0 ${
                          isSelected ? 'text-zinc-200' : 'text-zinc-500'
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="font-mono text-xs truncate font-semibold text-zinc-100">
                        {bh.name}
                      </span>
                    </div>
                    {bh.project && (
                      <div className="text-[10px] text-zinc-500 truncate pl-4.5">
                        {bh.project}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-zinc-400">
                    <span className="flex items-center gap-0.5 tabular-nums">
                      <Layers className="w-2.5 h-2.5 text-zinc-500" strokeWidth={1.5} />
                      {bh.layers.length} Sch.
                    </span>
                    <span className="tabular-nums">
                      {bh.maxDepth.toFixed(1)}m
                    </span>
                    <ArrowRight
                      className={`w-3 h-3 transition-transform ${
                        isSelected ? 'translate-x-0.5 text-zinc-200' : 'opacity-0'
                      }`}
                      strokeWidth={1.5}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
