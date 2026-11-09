import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ControlDock } from './components/ControlDock';
import { BoreholeInspector } from './components/BoreholeInspector';
import { LegendButton } from './components/LegendButton';
import { LayerTooltip } from './components/LayerTooltip';
import { ParameterModal } from './components/ParameterModal';
import {
  Borehole,
  BoreholeLayer,
  ClippingSettings,
  GeothermalProbeResult,
  HauptbodenartType,
  InterpolationSettings,
  ViewMode,
} from './types/geology';
import {
  computeStatsForBoreholes,
  DEMO_BREMEN_CSV,
  EMPTY_PARSE_RESULT,
  mergeParseResults,
  parseCSVData,
  parseExcelData,
  ParseResult,
} from './utils/parser';
import {
  calculateVirtualProbe,
  generateArcGisRasterCsv,
  interpolateVoxelGrid,
  InterpolationResult,
} from './utils/interpolation';
import {
  LITHOLOGY_CONFIG,
} from './utils/geothermal';
import { MapTileStyle } from './utils/mapTiles';

export default function App() {
  // Parse Result state: Starts EMPTY as requested! No data loaded until user loads file or demo.
  const [parseResult, setParseResult] = useState<ParseResult>(EMPTY_PARSE_RESULT);

  // Custom Lambda overrides
  const [customLambdas, setCustomLambdas] = useState<
    Partial<Record<HauptbodenartType, number>>
  >({});

  // View & Mode Settings
  const [viewMode, setViewMode] = useState<ViewMode>('lithology');

  const [interpolationSettings, setInterpolationSettings] =
    useState<InterpolationSettings>({
      idwExponent: 2.0,
      gridResolutionXY: 35,
      sliceThicknessZ: 2.0,
      zExaggeration: 8,
      boreholeRadius: 3.5,
      voxelOpacity: 0.8,
      voxelSizeFactor: 0.94,
      mapElevationM: 3.0,
    });

  const [clippingSettings, setClippingSettings] = useState<ClippingSettings>({
    enabled: false,
    minXPercent: 0,
    maxXPercent: 100,
    minYPercent: 0,
    maxYPercent: 100,
    maxDepthZ: -120,
  });

  // Active Lithologies filter
  const [activeLithologies, setActiveLithologies] = useState<
    Set<HauptbodenartType>
  >(() => new Set(Object.keys(LITHOLOGY_CONFIG) as HauptbodenartType[]));

  // Map & Visual Toggles - default mapOpacity is 1.0 (100% solid, eliminates hazy gray semi-transparent wash)
  const [mapOpacity, setMapOpacity] = useState(1.0);
  const [showMap, setShowMap] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapTileStyle>('esri-streets');
  const [showVoxels, setShowVoxels] = useState(true);
  const [showBoreholes, setShowBoreholes] = useState(true);

  // Interaction State
  const [selectedBorehole, setSelectedBorehole] = useState<Borehole | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<BoreholeLayer | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | undefined>();

  // Virtual Geothermal Probe State
  const [probeLocation, setProbeLocation] = useState<{
    easting: number;
    northing: number;
  } | null>(null);

  const [probeResult, setProbeResult] = useState<GeothermalProbeResult | null>(null);

  // UI Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [screenshotTrigger, setScreenshotTrigger] = useState(0);

  // Update clipping depth range when minZ changes
  useEffect(() => {
    if (parseResult.boreholes.length > 0) {
      setClippingSettings((prev) => ({
        ...prev,
        maxDepthZ: parseResult.stats.minZ,
      }));
    }
  }, [parseResult.stats.minZ, parseResult.boreholes.length]);

  // Compute 3D Voxel Interpolation Grid
  const interpolationResult: InterpolationResult = useMemo(() => {
    return interpolateVoxelGrid(parseResult.boreholes, interpolationSettings);
  }, [parseResult.boreholes, interpolationSettings]);

  // Helper function to read a single file (CSV or Excel) into a ParseResult
  const readFileToParseResult = useCallback(
    async (file: File): Promise<ParseResult> => {
      const isExcel =
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type.includes('spreadsheet') ||
        file.type.includes('excel');

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        return parseExcelData(buffer, customLambdas as any);
      } else {
        const text = await file.text();
        return parseCSVData(text, customLambdas as any);
      }
    },
    [customLambdas]
  );

  // Unified dataset application: guarantees Demo and File Upload behave 100% identically
  const applyDataset = useCallback(
    (dataset: ParseResult) => {
      setParseResult(dataset);
      const topCollar = dataset.stats.maxCollar;
      const targetMapElev =
        topCollar !== undefined && isFinite(topCollar)
          ? Math.min(10, Math.max(0, topCollar))
          : 3.0;

      setInterpolationSettings((prev) => ({
        ...prev,
        mapElevationM: targetMapElev,
      }));

      if (dataset.boreholes.length > 0) {
        const first = dataset.boreholes[0];
        setSelectedBorehole(first);
        setProbeLocation({ easting: first.eastingX, northing: first.northingY });
        setProbeResult(
          calculateVirtualProbe(
            first.eastingX,
            first.northingY,
            dataset.boreholes,
            interpolationSettings.idwExponent,
            100
          )
        );
      }
    },
    [interpolationSettings.idwExponent]
  );

  // Handle File Upload: supports single/multiple files and replace vs append mode
  const handleFileUpload = useCallback(
    async (filesInput: FileList | File[], append = false) => {
      const files = Array.from(filesInput);
      if (files.length === 0) return;

      try {
        let combined: ParseResult = append ? parseResult : EMPTY_PARSE_RESULT;

        for (const file of files) {
          const parsed = await readFileToParseResult(file);
          combined = mergeParseResults(combined, parsed);
        }

        applyDataset(combined);
      } catch (err) {
        console.error('Error reading/merging files:', err);
      }
    },
    [parseResult, readFileToParseResult, applyDataset]
  );

  // Load Demo Bremen-Vahr data
  const handleLoadDemoData = useCallback(() => {
    const res = parseCSVData(DEMO_BREMEN_CSV, customLambdas as any);
    applyDataset(res);
  }, [customLambdas, applyDataset]);

  // Clear all data back to clean start
  const handleClearData = useCallback(() => {
    setParseResult(EMPTY_PARSE_RESULT);
    setSelectedBorehole(null);
    setProbeLocation(null);
    setProbeResult(null);
  }, []);

  // Handle clicking on map/scene for geothermal probe calculation
  const handleMapClickProbe = useCallback(
    (easting: number, northing: number) => {
      setProbeLocation({ easting, northing });
      if (parseResult.boreholes.length > 0) {
        const probe = calculateVirtualProbe(
          easting,
          northing,
          parseResult.boreholes,
          interpolationSettings.idwExponent,
          100
        );
        setProbeResult(probe);
      } else {
        setProbeResult(null);
      }
    },
    [parseResult.boreholes, interpolationSettings.idwExponent]
  );

  // Lithology filter actions
  const handleToggleLithology = useCallback((lith: HauptbodenartType) => {
    setActiveLithologies((prev) => {
      const next = new Set(prev);
      if (next.has(lith)) next.delete(lith);
      else next.add(lith);
      return next;
    });
  }, []);

  const handleSelectAllLithologies = useCallback(() => {
    setActiveLithologies(new Set(Object.keys(LITHOLOGY_CONFIG) as HauptbodenartType[]));
  }, []);

  const handleSelectAquifersOnly = useCallback(() => {
    setActiveLithologies(
      new Set(['Feinsand', 'Mittelsand', 'Grobsand', 'Sand', 'Kies'] as HauptbodenartType[])
    );
  }, []);

  const handleSelectAquitardsOnly = useCallback(() => {
    setActiveLithologies(new Set(['Ton', 'Schluff', 'Torf'] as HauptbodenartType[]));
  }, []);

  // Export ArcGIS / QGIS 2D Raster CSV
  const handleExportArcGisCsv = useCallback(() => {
    if (interpolationResult.voxels.length === 0) return;
    const csvData = generateArcGisRasterCsv(
      interpolationResult.voxels,
      interpolationResult.gridDims
    );
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GeoBremen_Waermeleitfaehigkeit_ArcGIS_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [interpolationResult]);

  // Save custom lambdas
  const handleSaveCustomLambdas = useCallback(
    (newLambdas: Partial<Record<HauptbodenartType, number>>) => {
      setCustomLambdas(newLambdas);
      // Re-parse current boreholes with updated lambdas if data is loaded
      if (parseResult.boreholes.length > 0) {
        const updated = computeStatsForBoreholes(
          parseResult.boreholes.map((b) => ({
            ...b,
            layers: b.layers.map((l) => ({
              ...l,
              lambda: newLambdas[l.lithology] ?? l.lambda,
            })),
          }))
        );
        setParseResult(updated);
      }
    },
    [parseResult.boreholes]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d0e12] font-sans text-zinc-100 antialiased select-none">
      {/* Header */}
      <Header
        boreholeCount={parseResult.stats.boreholeCount}
        layerCount={parseResult.stats.layerCount}
        boreholes={parseResult.boreholes}
        selectedBorehole={selectedBorehole}
        onSelectBorehole={setSelectedBorehole}
        onTakeScreenshot={() => setScreenshotTrigger((prev) => prev + 1)}
        onExportArcGisCsv={handleExportArcGisCsv}
        onOpenParams={() => setIsParamModalOpen(true)}
      />

      {/* Left Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onFileUpload={handleFileUpload}
        onLoadDemoData={handleLoadDemoData}
        onClearData={handleClearData}
        stats={parseResult.stats}
        boreholes={parseResult.boreholes}
        selectedBorehole={selectedBorehole}
        onSelectBorehole={setSelectedBorehole}
        mapOpacity={mapOpacity}
        onChangeMapOpacity={setMapOpacity}
        mapElevationM={interpolationSettings.mapElevationM ?? 3.0}
        onChangeMapElevationM={(val) =>
          setInterpolationSettings((prev) => ({ ...prev, mapElevationM: val }))
        }
        showMap={showMap}
        onToggleMap={() => setShowMap(!showMap)}
        mapStyle={mapStyle}
        onChangeMapStyle={setMapStyle}
        activeLithologies={activeLithologies}
        onToggleLithology={handleToggleLithology}
        onSelectAllLithologies={handleSelectAllLithologies}
        onSelectAquifersOnly={handleSelectAquifersOnly}
        onSelectAquitardsOnly={handleSelectAquitardsOnly}
        showVoxels={showVoxels}
        onToggleVoxels={() => setShowVoxels(!showVoxels)}
        showBoreholes={showBoreholes}
        onToggleBoreholes={() => setShowBoreholes(!showBoreholes)}
      />

      {/* 3D WebGL Canvas */}
      <main className="w-full h-full">
        <ThreeCanvas
          boreholes={parseResult.boreholes}
          voxels={interpolationResult.voxels}
          gridDims={interpolationResult.gridDims}
          viewMode={viewMode}
          settings={interpolationSettings}
          clipping={clippingSettings}
          activeLithologies={activeLithologies}
          mapOpacity={mapOpacity}
          showMap={showMap}
          showVoxels={showVoxels}
          showBoreholes={showBoreholes}
          mapStyle={mapStyle}
          selectedBorehole={selectedBorehole}
          onSelectBorehole={setSelectedBorehole}
          onHoverLayer={(layer, pos) => {
            setHoveredLayer(layer);
            setHoverPos(pos);
          }}
          onMapClickProbe={handleMapClickProbe}
          probeLocation={probeLocation}
          screenshotTrigger={screenshotTrigger}
        />
      </main>

      {/* Hover Tooltip for Borehole Layer Segments */}
      <LayerTooltip layer={hoveredLayer} position={hoverPos} />

      {/* Dedicated Borehole Inspector (Measured Layers & Geothermal Probe) */}
      <BoreholeInspector
        selectedBorehole={selectedBorehole}
        probe={probeResult}
        viewMode={viewMode}
        onClose={() => {
          setSelectedBorehole(null);
          setProbeResult(null);
        }}
        onSelectLayerHover={setHoveredLayer}
      />

      {/* Expandable Thermal / Lithology Legend Floating Button */}
      <LegendButton viewMode={viewMode} />

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        settings={interpolationSettings}
        onUpdateSettings={(newS) =>
          setInterpolationSettings((prev) => ({ ...prev, ...newS }))
        }
        clipping={clippingSettings}
        onUpdateClipping={(newC) =>
          setClippingSettings((prev) => ({ ...prev, ...newC }))
        }
        minZ={parseResult.stats.minZ}
        maxZ={parseResult.stats.maxZ}
      />

      {/* Parameter Configuration Modal */}
      <ParameterModal
        isOpen={isParamModalOpen}
        onClose={() => setIsParamModalOpen(false)}
        customLambdas={customLambdas}
        onSave={handleSaveCustomLambdas}
        onReset={() => {
          setCustomLambdas({});
          if (parseResult.boreholes.length > 0) {
            setParseResult(parseCSVData(DEMO_BREMEN_CSV));
          }
        }}
      />
    </div>
  );
}
