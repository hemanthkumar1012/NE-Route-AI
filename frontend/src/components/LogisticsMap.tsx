import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

type Props = { segments?: Array<{name:string;coordinates:number[][];risk_score:number;status:string}>; incidents?: Array<{name:string;coordinates:[number,number];severity:string}> };
const center: LatLngExpression = [25.9, 92.9];
export default function LogisticsMap({ segments = [], incidents = [] }: Props) {
  const palette = (score:number, status:string) => status === 'CLOSED' ? '#dc2626' : score >= 65 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#16a34a';
  return <div className="map-shell"><MapContainer center={center} zoom={6} scrollWheelZoom className="leaflet-map">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {segments.map(s => <Polyline key={s.name} positions={s.coordinates.map(([lng,lat]) => [lat,lng] as [number,number])} pathOptions={{color:palette(s.risk_score,s.status),weight:5,opacity:.85}}><Popup>{s.name} · Risk {s.risk_score} · {s.status} · SIMULATED</Popup></Polyline>)}
    {incidents.map(i => <CircleMarker key={i.name} center={[i.coordinates[1],i.coordinates[0]]} radius={8} pathOptions={{color:'#b91c1c',fillColor:'#fca5a5',fillOpacity:.9}}><Popup>{i.name} · {i.severity}</Popup></CircleMarker>)}
  </MapContainer></div>;
}
