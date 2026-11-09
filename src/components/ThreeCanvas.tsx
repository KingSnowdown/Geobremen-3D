import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Borehole,
  BoreholeLayer,
  ClippingSettings,
  HauptbodenartType,
  InterpolationSettings,
  ViewMode,
  VoxelData,
} from '../types/geology';
import {
  KF_COLORS,
  LITHOLOGY_CONFIG,
  getLambdaColor,
} from '../utils/geothermal';
import {
  generateBremenMapTexture,
  MapBounds,
  MapTileStyle,
} from '../utils/mapTiles';
import { InterpolationResult } from '../utils/interpolation';

interface ThreeCanvasProps {
  boreholes: Borehole[];
  voxels: VoxelData[];
  gridDims?: InterpolationResult['gridDims'];
  viewMode: ViewMode;
  settings: InterpolationSettings;
  clipping: ClippingSettings;
  activeLithologies: Set<HauptbodenartType>;
  mapOpacity: number;
  showMap: boolean;
  showVoxels: boolean;
  showBoreholes: boolean;
  mapStyle: MapTileStyle;
  selectedBorehole: Borehole | null;
  onSelectBorehole: (bh: Borehole | null) => void;
  onHoverLayer: (layer: BoreholeLayer | null, screenPos?: { x: number; y: number }) => void;
  onMapClickProbe: (easting: number, northing: number) => void;
  probeLocation: { easting: number; northing: number } | null;
  screenshotTrigger: number;
  onScreenshotReady?: (dataUrl: string) => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  boreholes,
  voxels,
  gridDims,
  viewMode,
  settings,
  clipping,
  activeLithologies,
  mapOpacity,
  showMap,
  showVoxels,
  showBoreholes,
  mapStyle,
  selectedBorehole,
  onSelectBorehole,
  onHoverLayer,
  onMapClickProbe,
  probeLocation,
  screenshotTrigger,
  onScreenshotReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to keep Three objects stable across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Groups
  const boreholesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const mapMeshRef = useRef<THREE.Mesh | null>(null);
  const voxelMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const probeMarkerRef = useRef<THREE.Group | null>(null);
  const labelsGroupRef = useRef<THREE.Group>(new THREE.Group());

  // Cached center coordinates for UTM offset
  const centerRef = useRef<{ x: number; y: number; z: number }>({
    x: 491899,
    y: 5882016,
    z: 0,
  });

  // Layer mapping for raycasting
  const layerCylinderMapRef = useRef<
    Map<string, { layer: BoreholeLayer; borehole: Borehole }>
  >(new Map());

  // Reusable math objects
  const _vec3 = useRef(new THREE.Vector3());
  const _mat4 = useRef(new THREE.Matrix4());
  const _color = useRef(new THREE.Color());
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // Ground plane raycast target
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);

  // Calculate center from boreholes
  useEffect(() => {
    if (boreholes.length > 0) {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      for (const b of boreholes) {
        sumX += b.eastingX;
        sumY += b.northingY;
        sumZ += b.collarElevation;
      }
      centerRef.current = {
        x: sumX / boreholes.length,
        y: sumY / boreholes.length,
        z: sumZ / boreholes.length,
      };
    } else {
      centerRef.current = {
        x: 492300,
        y: 5882400,
        z: 3.0,
      };
    }
  }, [boreholes]);

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#090d16');

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 10000);
    camera.position.set(250, 220, 320);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.replaceChildren(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI - 0.05; // allow viewing from underground
    controls.minDistance = 5;
    controls.maxDistance = 5000;
    controls.target.set(0, -30, 0);

    // Procedural Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting
    const hemiLight = new THREE.HemisphereLight('#94a3b8', '#1e293b', 1.0);
    scene.add(hemiLight);

    const dirKeyLight = new THREE.DirectionalLight('#ffffff', 1.4);
    dirKeyLight.position.set(300, 500, 250);
    dirKeyLight.castShadow = !isSoftwareGl;
    scene.add(dirKeyLight);

    const dirFillLight = new THREE.DirectionalLight('#38bdf8', 0.4);
    dirFillLight.position.set(-250, -100, -200);
    scene.add(dirFillLight);

    // Add Groups to Scene
    scene.add(boreholesGroupRef.current);
    scene.add(labelsGroupRef.current);

    // Ground Plane for Raycasting
    const invisibleGround = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    invisibleGround.rotation.x = -Math.PI / 2;
    invisibleGround.position.y = (settings.mapElevationM ?? 3.0) * settings.zExaggeration;
    scene.add(invisibleGround);
    groundPlaneRef.current = invisibleGround;

    // Render loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // 2. Load & Update Bremen Ground Map Plane
  useEffect(() => {
    if (!sceneRef.current) return;

    let isCancelled = false;
    let cx = centerRef.current.x;
    let cy = centerRef.current.y;
    let widthMeters = 1600;
    let heightMeters = 1600;

    if (boreholes.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const b of boreholes) {
        minX = Math.min(minX, b.eastingX);
        maxX = Math.max(maxX, b.eastingX);
        minY = Math.min(minY, b.northingY);
        maxY = Math.max(maxY, b.northingY);
      }
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
      centerRef.current.x = cx;
      centerRef.current.y = cy;
      widthMeters = Math.max(1200, (maxX - minX) * 1.5);
      heightMeters = Math.max(1200, (maxY - minY) * 1.5);
    }

    generateBremenMapTexture(cx, cy, widthMeters, heightMeters, mapStyle).then(
      ({ texture, bounds }) => {
        if (isCancelled || !sceneRef.current) return;

        if (mapMeshRef.current) {
          sceneRef.current.remove(mapMeshRef.current);
          mapMeshRef.current.geometry.dispose();
          if (Array.isArray(mapMeshRef.current.material)) {
            mapMeshRef.current.material.forEach((m) => m.dispose());
          } else {
            mapMeshRef.current.material.dispose();
          }
        }

        const geo = new THREE.PlaneGeometry(bounds.widthMeters, bounds.heightMeters);

        // Ensure high-order anisotropic filtering for crystal-clear street labels at oblique angles
        if (rendererRef.current) {
          texture.anisotropy = Math.min(16, rendererRef.current.capabilities.getMaxAnisotropy());
        }

        // For satellite, keep MeshStandardMaterial (as requested: "Die Karte Satellit ist gut und kann unverändert bleiben")
        // For street, OSM, and topo maps, use MeshBasicMaterial so directional lights and tone mapping do not bleach or wash out colors
        const isSatellite = mapStyle === 'esri-imagery';
        const isSolid = mapOpacity >= 0.98;
        const mat = isSatellite
          ? new THREE.MeshStandardMaterial({
              map: texture,
              transparent: !isSolid,
              opacity: showMap ? mapOpacity : 0,
              roughness: 0.8,
              metalness: 0.1,
              side: THREE.DoubleSide,
              depthWrite: isSolid,
            })
          : new THREE.MeshBasicMaterial({
              map: texture,
              transparent: !isSolid,
              opacity: showMap ? mapOpacity : 0,
              side: THREE.DoubleSide,
              depthWrite: isSolid,
            });

        const planeMesh = new THREE.Mesh(geo, mat);
        planeMesh.rotation.x = -Math.PI / 2;
        const mapY = (settings.mapElevationM ?? 3.0) * settings.zExaggeration;
        planeMesh.position.set(
          bounds.centerEasting - cx,
          mapY,
          -(bounds.centerNorthing - cy)
        );

        sceneRef.current.add(planeMesh);
        mapMeshRef.current = planeMesh;
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [boreholes, mapStyle, mapOpacity, showMap, settings.mapElevationM, settings.zExaggeration]);

  // Update map opacity and vertical position live
  useEffect(() => {
    const mapY = (settings.mapElevationM ?? 3.0) * settings.zExaggeration;
    if (mapMeshRef.current) {
      const mat = mapMeshRef.current.material as THREE.Material & {
        opacity: number;
        visible: boolean;
        transparent: boolean;
        depthWrite: boolean;
        needsUpdate: boolean;
      };
      const isSolid = mapOpacity >= 0.98;
      mat.opacity = showMap ? mapOpacity : 0;
      mat.visible = showMap && mapOpacity > 0.01;
      mat.transparent = !isSolid;
      mat.depthWrite = isSolid;
      mat.needsUpdate = true;
      mapMeshRef.current.position.y = mapY;
    }
    if (groundPlaneRef.current) {
      groundPlaneRef.current.position.y = mapY;
    }
  }, [mapOpacity, showMap, settings.mapElevationM, settings.zExaggeration]);

  // 3. Render Borehole Cylinders & Labels
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clear previous borehole meshes
    while (boreholesGroupRef.current.children.length > 0) {
      const obj = boreholesGroupRef.current.children[0] as THREE.Mesh;
      boreholesGroupRef.current.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else (obj.material as THREE.Material).dispose();
      }
    }
    while (labelsGroupRef.current.children.length > 0) {
      const obj = labelsGroupRef.current.children[0];
      labelsGroupRef.current.remove(obj);
    }
    layerCylinderMapRef.current.clear();

    if (!showBoreholes || boreholes.length === 0) return;

    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    const zExag = settings.zExaggeration;
    const radius = Math.max(0.5, settings.boreholeRadius);

    for (const b of boreholes) {
      const localX = b.eastingX - cx;
      const localZ = -(b.northingY - cy);

      // Top collar marker (ground ring / cylinder head)
      const headGeo = new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.8, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        metalness: 0.5,
        roughness: 0.2,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(localX, b.collarElevation * zExag + 0.4, localZ);
      boreholesGroupRef.current.add(headMesh);

      // Text Sprite Label above collar
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 384;
      labelCanvas.height = 96;
      const ctx = labelCanvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, 376, 88, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(b.name, 16, 36);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(
        `Tiefe: ${b.maxDepth.toFixed(1)}m | Ans: ${b.collarElevation.toFixed(2)}m`,
        16,
        68
      );

      const spriteTex = new THREE.CanvasTexture(labelCanvas);
      spriteTex.colorSpace = THREE.SRGBColorSpace;
      const spriteMat = new THREE.SpriteMaterial({
        map: spriteTex,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(38, 9.5, 1);
      const groundY = (settings.mapElevationM ?? 3.0) * zExag;
      sprite.position.set(localX, Math.max(groundY, b.collarElevation * zExag) + 14, localZ);
      labelsGroupRef.current.add(sprite);

      // Render each layer segment
      for (const layer of b.layers) {
        const topY = layer.zTop * zExag;
        const bottomY = layer.zBottom * zExag;
        const layerHeight = Math.max(0.1, topY - bottomY);
        const midY = (topY + bottomY) / 2;

        const cylGeo = new THREE.CylinderGeometry(radius, radius, layerHeight, 20);

        // Determine color based on ViewMode
        let segColor = '#cccccc';
        if (viewMode === 'lithology') {
          segColor = LITHOLOGY_CONFIG[layer.lithology]?.color || '#cbd5e1';
        } else if (viewMode === 'lambda') {
          segColor = getLambdaColor(layer.lambda);
        } else if (viewMode === 'kf') {
          segColor = KF_COLORS[layer.kfClass] || '#64748b';
        }

        const cylMat = new THREE.MeshStandardMaterial({
          color: segColor,
          roughness: 0.35,
          metalness: 0.15,
        });

        const cylMesh = new THREE.Mesh(cylGeo, cylMat);
        cylMesh.position.set(localX, midY, localZ);
        cylMesh.name = layer.id;

        // Store mapping for raycasting
        layerCylinderMapRef.current.set(layer.id, { layer, borehole: b });

        boreholesGroupRef.current.add(cylMesh);
      }
    }
  }, [boreholes, viewMode, settings.zExaggeration, settings.boreholeRadius, showBoreholes]);

  // 4. Render 3D Interpolated Voxel Model via THREE.InstancedMesh
  useEffect(() => {
    if (!sceneRef.current) return;

    if (voxelMeshRef.current) {
      sceneRef.current.remove(voxelMeshRef.current);
      voxelMeshRef.current.geometry.dispose();
      (voxelMeshRef.current.material as THREE.Material).dispose();
      voxelMeshRef.current = null;
    }

    if (!showVoxels || voxels.length === 0) return;

    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    const zExag = settings.zExaggeration;

    // Filter voxels based on clipping settings and active lithologies
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const v of voxels) {
      minX = Math.min(minX, v.worldX);
      maxX = Math.max(maxX, v.worldX);
      minY = Math.min(minY, v.worldY);
      maxY = Math.max(maxY, v.worldY);
      minZ = Math.min(minZ, v.worldZ);
      maxZ = Math.max(maxZ, v.worldZ);
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Exact cell sizes from grid dimensions or fallback
    let dx = gridDims?.dx ?? 15;
    let dy = gridDims?.dy ?? 15;
    let dz = gridDims?.dz ?? (settings.sliceThicknessZ || 2.0);

    if (!gridDims && voxels.length > 1) {
      const v0 = voxels[0];
      for (let i = 1; i < Math.min(100, voxels.length); i++) {
        if (Math.abs(voxels[i].worldX - v0.worldX) > 0.1 && dx === 15) {
          dx = Math.abs(voxels[i].worldX - v0.worldX);
        }
        if (Math.abs(voxels[i].worldY - v0.worldY) > 0.1 && dy === 15) {
          dy = Math.abs(voxels[i].worldY - v0.worldY);
        }
        if (Math.abs(voxels[i].worldZ - v0.worldZ) > 0.1 && dz === 2) {
          dz = Math.abs(voxels[i].worldZ - v0.worldZ);
        }
      }
    }

    const sizeFactor = Math.max(0.6, Math.min(1.0, settings.voxelSizeFactor || 0.94));
    const voxelBoxGeo = new THREE.BoxGeometry(
      dx * sizeFactor,
      dz * zExag * sizeFactor,
      dy * sizeFactor
    );

    const voxelMat = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.0,
      transparent: settings.voxelOpacity < 0.99,
      opacity: settings.voxelOpacity,
    });

    // Visible voxels list
    const visibleVoxels: VoxelData[] = [];

    for (const v of voxels) {
      // 1. Lithology filter
      if (!activeLithologies.has(v.lithology)) continue;

      // 2. Clipping filters
      if (clipping.enabled) {
        const xPct = ((v.worldX - minX) / rangeX) * 100;
        const yPct = ((v.worldY - minY) / rangeY) * 100;

        if (xPct < clipping.minXPercent || xPct > clipping.maxXPercent) continue;
        if (yPct < clipping.minYPercent || yPct > clipping.maxYPercent) continue;
        if (v.worldZ < clipping.maxDepthZ) continue;
      }

      visibleVoxels.push(v);
    }

    const instancedMesh = new THREE.InstancedMesh(
      voxelBoxGeo,
      voxelMat,
      visibleVoxels.length
    );
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < visibleVoxels.length; i++) {
      const v = visibleVoxels[i];
      const lx = v.worldX - cx;
      const ly = v.worldZ * zExag;
      const lz = -(v.worldY - cy);

      dummy.position.set(lx, ly, lz);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);

      // Color based on view mode
      let cHex = '#3b82f6';
      if (viewMode === 'lithology') {
        cHex = LITHOLOGY_CONFIG[v.lithology]?.color || '#94a3b8';
      } else if (viewMode === 'lambda') {
        cHex = getLambdaColor(v.lambda);
      } else if (viewMode === 'kf') {
        cHex = KF_COLORS[v.kfClass] || '#64748b';
      }

      _color.current.set(cHex);
      instancedMesh.setColorAt(i, _color.current);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    instancedMesh.computeBoundingSphere();

    sceneRef.current.add(instancedMesh);
    voxelMeshRef.current = instancedMesh;
  }, [
    voxels,
    viewMode,
    settings.zExaggeration,
    settings.voxelOpacity,
    settings.voxelSizeFactor,
    clipping,
    activeLithologies,
    showVoxels,
  ]);

  // 5. Render Virtual Geothermal Probe Marker
  useEffect(() => {
    if (!sceneRef.current) return;

    if (probeMarkerRef.current) {
      sceneRef.current.remove(probeMarkerRef.current);
      probeMarkerRef.current = null;
    }

    if (!probeLocation) return;

    const group = new THREE.Group();
    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    const zExag = settings.zExaggeration;

    const lx = probeLocation.easting - cx;
    const lz = -(probeLocation.northing - cy);

    // Vertical line representing 100m probe starting from surface downwards
    const probeLength = 100 * zExag;
    const surfaceY = (settings.mapElevationM ?? 3.0) * zExag;
    const cylinderGeo = new THREE.CylinderGeometry(2.0, 2.0, probeLength, 16);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#b91c1c',
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    const probeMesh = new THREE.Mesh(cylinderGeo, cylinderMat);
    probeMesh.position.set(lx, surfaceY - probeLength / 2, lz);
    group.add(probeMesh);

    // Top Marker Ring on ground surface
    const ringGeo = new THREE.TorusGeometry(8, 0.8, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(lx, surfaceY + 0.8, lz);
    group.add(ringMesh);

    sceneRef.current.add(group);
    probeMarkerRef.current = group;
  }, [probeLocation, settings.zExaggeration, settings.mapElevationM]);

  // 5b. Highlight Selected Borehole and Smooth Fly-To Focus
  const selectionMarkerRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (selectionMarkerRef.current) {
      sceneRef.current.remove(selectionMarkerRef.current);
      selectionMarkerRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
      selectionMarkerRef.current = null;
    }

    if (!selectedBorehole) return;

    const cx = centerRef.current.x;
    const cy = centerRef.current.y;
    const zExag = settings.zExaggeration;
    const radius = Math.max(0.5, settings.boreholeRadius);

    const tx = selectedBorehole.eastingX - cx;
    const tz = -(selectedBorehole.northingY - cy);
    const collarY = selectedBorehole.collarElevation * zExag;
    const bottomY = collarY - selectedBorehole.maxDepth * zExag;
    const midY = (collarY + bottomY) / 2;

    const group = new THREE.Group();

    // Top ground cyan beacon ring
    const ringGeo = new THREE.TorusGeometry(radius * 3.5, 0.9, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(tx, collarY + 1.2, tz);
    group.add(ringMesh);

    // Glowing selection cylinder cage around the entire borehole
    const cageHeight = Math.max(2, collarY - bottomY);
    const cageGeo = new THREE.CylinderGeometry(radius * 2.2, radius * 2.2, cageHeight, 16, 1, true);
    const cageMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    cageMesh.position.set(tx, midY, tz);
    group.add(cageMesh);

    sceneRef.current.add(group);
    selectionMarkerRef.current = group;

    // Smooth camera focus
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.set(tx, midY, tz);
      const camOffset = Math.max(90, selectedBorehole.maxDepth * zExag * 0.8);
      cameraRef.current.position.set(tx + camOffset * 0.7, collarY + camOffset * 0.45, tz + camOffset * 0.8);
      controlsRef.current.update();
    }
  }, [selectedBorehole, settings.zExaggeration, settings.boreholeRadius]);

  // 6. Screenshot Exporter handler
  useEffect(() => {
    if (screenshotTrigger === 0 || !rendererRef.current || !sceneRef.current || !cameraRef.current)
      return;

    // Render immediately to preserve drawing buffer
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');

    if (onScreenshotReady) {
      onScreenshotReady(dataUrl);
    } else {
      // Direct download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `GeoBremen_3D_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    }
  }, [screenshotTrigger, onScreenshotReady]);

  // 7. Raycasting for Mouse Hover & Click
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!cameraRef.current || !mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, cameraRef.current);

      // Check intersections with borehole cylinder meshes
      const intersects = raycaster.current.intersectObjects(
        boreholesGroupRef.current.children,
        false
      );

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const entry = layerCylinderMapRef.current.get(hit.name);
        if (entry) {
          onHoverLayer(entry.layer, { x: e.clientX, y: e.clientY });
          return;
        }
      }
      onHoverLayer(null);
    },
    [onHoverLayer]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cameraRef.current || !mountRef.current || !sceneRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, cameraRef.current);

      // 1. Check borehole hit first
      const bhIntersects = raycaster.current.intersectObjects(
        boreholesGroupRef.current.children,
        false
      );
      if (bhIntersects.length > 0) {
        const hit = bhIntersects[0].object;
        const entry = layerCylinderMapRef.current.get(hit.name);
        if (entry) {
          onSelectBorehole(entry.borehole);
          onMapClickProbe(entry.borehole.eastingX, entry.borehole.northingY);
          return;
        }
      }

      // 2. Check Map plane / Ground plane hit for Geothermal Probe placement
      const planeTargets: THREE.Object3D[] = [];
      if (mapMeshRef.current) planeTargets.push(mapMeshRef.current);
      if (groundPlaneRef.current) planeTargets.push(groundPlaneRef.current);

      const groundIntersects = raycaster.current.intersectObjects(planeTargets, false);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        const easting = point.x + centerRef.current.x;
        const northing = -point.z + centerRef.current.y;
        onMapClickProbe(easting, northing);
      }
    },
    [onSelectBorehole, onMapClickProbe]
  );

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full cursor-crosshair overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    />
  );
};
