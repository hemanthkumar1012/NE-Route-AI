import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

type Segment = { name: string; coordinates: number[][]; risk_score: number; status: string };
type Incident = { name: string; coordinates: [number, number]; severity: string };
type Props = { segments?: Segment[]; incidents?: Incident[]; compact?: boolean };
type Hub = { name: string; x: number; z: number; color: number; tier: 'PRIMARY' | 'REGIONAL' };

const HUBS: Hub[] = [
  { name: 'Guwahati', x: -5.0, z: 0.8, color: 0x55e5d2, tier: 'PRIMARY' },
  { name: 'Shillong', x: -3.7, z: 2.2, color: 0x62d9c9, tier: 'REGIONAL' },
  { name: 'Silchar', x: -1.5, z: 3.1, color: 0x62d9c9, tier: 'REGIONAL' },
  { name: 'Dimapur', x: 0.4, z: 0.1, color: 0x55e5d2, tier: 'PRIMARY' },
  { name: 'Kohima', x: 1.5, z: 0.8, color: 0x62d9c9, tier: 'REGIONAL' },
  { name: 'Imphal', x: 3.5, z: 1.9, color: 0x55e5d2, tier: 'PRIMARY' },
  { name: 'Aizawl', x: 2.0, z: 3.7, color: 0x62d9c9, tier: 'REGIONAL' },
  { name: 'Dibrugarh', x: 4.0, z: -2.1, color: 0x62d9c9, tier: 'REGIONAL' },
  { name: 'Itanagar', x: 2.2, z: -3.2, color: 0x62d9c9, tier: 'REGIONAL' },
];

const ROUTES: Array<{ hubs: string[]; color: number; speed: number }> = [
  { hubs: ['Guwahati', 'Shillong', 'Silchar'], color: 0x51dccc, speed: 0.055 },
  { hubs: ['Guwahati', 'Dimapur', 'Kohima', 'Imphal'], color: 0xffbd78, speed: 0.072 },
  { hubs: ['Dimapur', 'Dibrugarh', 'Itanagar'], color: 0x5ea9ee, speed: 0.048 },
  { hubs: ['Silchar', 'Aizawl', 'Imphal'], color: 0x51dccc, speed: 0.061 },
];

function terrainHeight(x: number, z: number) {
  const peaks = [
    { x: -3.8, z: 1.6, scale: 1.55, spread: 2.25 },
    { x: -0.2, z: -0.4, scale: 1.85, spread: 1.6 },
    { x: 2.4, z: 1.0, scale: 1.75, spread: 1.8 },
    { x: 3.8, z: -2.5, scale: 1.45, spread: 1.45 },
    { x: 0.9, z: 3.6, scale: 1.15, spread: 1.9 },
  ];
  let elevation = 0.10;
  for (const peak of peaks) {
    const dx = x - peak.x;
    const dz = z - peak.z;
    elevation += peak.scale * Math.exp(-((dx * dx) + (dz * dz)) / peak.spread);
  }
  elevation += 0.12 * Math.sin(x * 1.65 + z * 0.8) + 0.09 * Math.cos(z * 2.1 - x * 0.45);
  elevation += 0.045 * Math.sin(x * 3.5 + z * 2.2);
  return Math.max(0.05, elevation);
}

function cityLabel(name: string, tier: Hub['tier']) {
  const element = document.createElement('div');
  element.className = 'terrain-city-label' + (tier === 'PRIMARY' ? ' primary' : '');
  const dot = document.createElement('span');
  dot.className = 'terrain-city-dot';
  const text = document.createElement('b');
  text.textContent = name;
  element.append(dot, text);
  return element;
}

export default function SpatialScene({ segments = [], incidents = [], compact = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFallback(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x071722, 0.027);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(12.8, 10.6, 14.2);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setClearColor(0x071722, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.className = 'terrain-webgl';
    mount.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    labels.setSize(mount.clientWidth || 800, mount.clientHeight || 420);
    labels.domElement.className = 'terrain-label-layer';
    labels.domElement.style.pointerEvents = 'none';
    mount.appendChild(labels.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 9.2;
    controls.maxDistance = 23;
    controls.minPolarAngle = 0.42;
    controls.maxPolarAngle = 1.23;
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotateSpeed = 0.23;
    controls.target.set(0, 0.45, 0);

    scene.add(new THREE.HemisphereLight(0x9bd8e1, 0x07141d, 1.4));
    const keyLight = new THREE.DirectionalLight(0xf0fbff, 2.2);
    keyLight.position.set(-7, 14, 9);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x23c9be, 22, 28, 2);
    rimLight.position.set(6, 5, -5);
    scene.add(rimLight);
    const warmLight = new THREE.PointLight(0xffa96e, 9, 22, 2);
    warmLight.position.set(-7, 3, 4);
    scene.add(warmLight);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(14.45, 0.42, 10.45),
      new THREE.MeshStandardMaterial({ color: 0x102c3a, metalness: 0.42, roughness: 0.65 })
    );
    floor.position.y = -0.35;
    scene.add(floor);

    const terrainGeometry = new THREE.PlaneGeometry(14, 10, 132, 96);
    terrainGeometry.rotateX(-Math.PI / 2);
    const positions = terrainGeometry.attributes.position as THREE.BufferAttribute;
    const vertexColors: number[] = [];
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const elevation = terrainHeight(x, z);
      positions.setY(i, elevation);
      const normalized = Math.min(1, elevation / 3.15);
      color.setHSL(0.49 - normalized * 0.035, 0.40 + normalized * 0.23, 0.17 + normalized * 0.15);
      vertexColors.push(color.r, color.g, color.b);
    }
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    terrainGeometry.computeVertexNormals();

    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0.16, side: THREE.DoubleSide })
    );
    terrain.position.y = 0.03;
    scene.add(terrain);

    // Low-opacity contour traces are visual guides, not surveyed elevation data.
    const peaks = [{ x: -3.8, z: 1.6 }, { x: -0.2, z: -0.4 }, { x: 2.4, z: 1.0 }, { x: 3.8, z: -2.5 }];
    for (const peak of peaks) {
      for (const radius of [0.44, 0.66, 0.88, 1.10, 1.32]) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 96; i += 1) {
          const angle = (i / 96) * Math.PI * 2;
          const x = peak.x + Math.cos(angle) * radius * (1 + 0.10 * Math.sin(angle * 3));
          const z = peak.z + Math.sin(angle) * radius * 0.74;
          points.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.045, z));
        }
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        scene.add(new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0x64d7ce, transparent: true, opacity: 0.16 })));
      }
    }

    const grid = new THREE.GridHelper(26, 26, 0x2a6b72, 0x194252);
    grid.position.y = -0.10;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.20;
    scene.add(grid);

    const hubByName = new Map(HUBS.map(hub => [hub.name, hub]));
    const movingPulses: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; speed: number; offset: number }> = [];
    for (const route of ROUTES) {
      const points = route.hubs
        .map(name => hubByName.get(name))
        .filter((hub): hub is Hub => Boolean(hub))
        .map(hub => new THREE.Vector3(hub.x, terrainHeight(hub.x, hub.z) + 0.19, hub.z));
      if (points.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(points);
      const halo = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 100, 0.075, 7, false),
        new THREE.MeshBasicMaterial({ color: route.color, transparent: true, opacity: 0.11 })
      );
      const routeLine = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 100, 0.019, 6, false),
        new THREE.MeshBasicMaterial({ color: route.color, transparent: true, opacity: 0.96 })
      );
      scene.add(halo, routeLine);
      for (let i = 0; i < 2; i += 1) {
        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 14, 14),
          new THREE.MeshBasicMaterial({ color: route.color })
        );
        scene.add(pulse);
        movingPulses.push({ mesh: pulse, curve, speed: route.speed, offset: i * 0.49 });
      }
    }

    for (const hub of HUBS) {
      const y = terrainHeight(hub.x, hub.z);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(hub.tier === 'PRIMARY' ? 0.26 : 0.18, 0.018, 7, 42),
        new THREE.MeshBasicMaterial({ color: hub.color, transparent: true, opacity: 0.85 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(hub.x, y + 0.12, hub.z);
      scene.add(ring);

      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(hub.tier === 'PRIMARY' ? 0.115 : 0.075, 20, 20),
        new THREE.MeshStandardMaterial({ color: hub.color, emissive: hub.color, emissiveIntensity: 0.9, metalness: 0.35, roughness: 0.24 })
      );
      pin.position.set(hub.x, y + 0.24, hub.z);
      scene.add(pin);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.025, 0.25, 8),
        new THREE.MeshBasicMaterial({ color: hub.color, transparent: true, opacity: 0.72 })
      );
      stem.position.set(hub.x, y + 0.39, hub.z);
      scene.add(stem);

      const label = new CSS2DObject(cityLabel(hub.name, hub.tier));
      label.position.set(hub.x + 0.04, y + 0.68, hub.z);
      scene.add(label);
    }

    const incidentMarkers = Math.min(incidents.length, 8);
    for (let i = 0; i < incidentMarkers; i += 1) {
      const hub = HUBS[(i * 2 + 3) % HUBS.length];
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.13, 0),
        new THREE.MeshStandardMaterial({ color: 0xffa566, emissive: 0xd85c32, emissiveIntensity: 0.85 })
      );
      marker.position.set(hub.x + 0.42, terrainHeight(hub.x + 0.42, hub.z + 0.34) + 0.36, hub.z + 0.34);
      scene.add(marker);
      const beacon = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.012, 6, 28),
        new THREE.MeshBasicMaterial({ color: 0xffa566, transparent: true, opacity: 0.76 })
      );
      beacon.rotation.x = -Math.PI / 2;
      beacon.position.set(marker.position.x, marker.position.y - 0.10, marker.position.z);
      scene.add(beacon);
    }

    const starPositions = new Float32Array(210 * 3);
    for (let i = 0; i < 210; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 19;
      starPositions[i * 3 + 1] = 1.6 + Math.random() * 4.2;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x7fd8d3, size: 0.026, transparent: true, opacity: 0.52 }));
    scene.add(stars);

    const clock = new THREE.Clock();
    let frame = 0;
    let disposed = false;
    let didRender = false;
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      labels.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const animate = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      controls.update();
      movingPulses.forEach(pulse => {
        const position = (elapsed * pulse.speed + pulse.offset) % 1;
        pulse.mesh.position.copy(pulse.curve.getPointAt(position));
      });
      stars.rotation.y = Math.sin(elapsed * 0.06) * 0.025;
      renderer.render(scene, camera);
      labels.render(scene, camera);
      if (!didRender) {
        didRender = true;
        setRendered(true);
      }
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach(item => item.dispose());
        else if (material) material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
    };
  }, []);

  return (
    <div className={'terrain-scene ' + (compact ? 'compact' : '') + (fallback ? ' fallback' : '')} aria-label="Interactive schematic three-dimensional North East India terrain and logistics network">
      <div className="terrain-scene-canvas" ref={mountRef}/>
      <div className="terrain-scene-topline">
        <span className="terrain-scene-kicker"><i/> RELIEF / NETWORK MODEL</span>
        <span className="terrain-scene-badge">SCHEMATIC 3D</span>
      </div>
      {fallback && <div className="terrain-fallback-card">
        <b>3D rendering unavailable</b>
        <span>Use the 2D GIS view for this browser or device.</span>
      </div>}
      <div className="terrain-scene-stats">
        <span><b>{HUBS.length.toString().padStart(2, '0')}</b><small>RELIEF HUBS</small></span>
        <span><b>{ROUTES.length.toString().padStart(2, '0')}</b><small>SCHEMATIC ROUTES</small></span>
        <span><b>{incidents.length.toString().padStart(2, '0')}</b><small>API INCIDENTS</small></span>
      </div>
      <div className="terrain-scene-caption">
        <span>NOT FOR NAVIGATION · NOT LIVE GPS</span>
        {!compact && <span>DRAG TO ROTATE <i/> SCROLL TO ZOOM</span>}
      </div>
      {rendered && <span className="terrain-ready-dot" aria-label="3D scene ready"/>}
    </div>
  );
}
