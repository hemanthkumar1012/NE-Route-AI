import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

type Props = { segments?: Array<{name:string;coordinates:number[][];risk_score:number;status:string}>; incidents?: Array<{name:string;coordinates:[number,number];severity:string}> };

export const REGIONS: Array<{key:string;label:string;center:[number,number];zoom:number}> = [
  { key: 'WORLD', label: 'World view', center: [18, 60], zoom: 3 },
  { key: 'NER', label: 'North East India', center: [25.9, 92.9], zoom: 6 },
  { key: 'EAF', label: 'East Africa', center: [-0.5, 35.5], zoom: 5 },
  { key: 'SEA', label: 'Southeast Asia', center: [15.5, 102.5], zoom: 5 },
  { key: 'AND', label: 'Andes', center: [-14.2, -72.5], zoom: 5 },
];

function RegionFlyTo({ region }: { region: typeof REGIONS[number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(region.center as LatLngExpression, region.zoom, { duration: 0.8 }); }, [map, region]);
  return null;
}

export default function LogisticsMap({ segments = [], incidents = [] }: Props) {
  const [region, setRegion] = useState(REGIONS[1]);
  const palette = (score:number, status:string) => status === 'CLOSED' ? '#dc2626' : score >= 65 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#16a34a';
  return <div className="map-shell">
    <div className="map-region-switch" style={{display:'flex',gap:6,flexWrap:'wrap',padding:'6px 0'}}>
      {REGIONS.map(r => <button key={r.key} type="button" className={`button ${region.key===r.key?'primary':''}`} style={{padding:'4px 10px',fontSize:12}} onClick={() => setRegion(r)}>{r.label}</button>)}
    </div>
    <MapContainer center={region.center as LatLngExpression} zoom={region.zoom} scrollWheelZoom className="leaflet-map">
      <RegionFlyTo region={region} />
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {segments.map(s => <Polyline key={s.name} positions={s.coordinates.map(([lng,lat]) => [lat,lng] as [number,number])} pathOptions={{color:palette(s.risk_score,s.status),weight:5,opacity:.85}}><Popup>{s.name} · Risk {s.risk_score} · {s.status} · SIMULATED</Popup></Polyline>)}
      {incidents.map(i => <CircleMarker key={i.name} center={[i.coordinates[1],i.coordinates[0]]} radius={8} pathOptions={{color:'#b91c1c',fillColor:'#fca5a5',fillOpacity:.9}}><Popup>{i.name} · {i.severity}</Popup></CircleMarker>)}
    </MapContainer>
  </div>;
}
