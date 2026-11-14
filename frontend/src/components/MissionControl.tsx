import { useState } from 'react';
import { ClipboardList, Download, MapPin, Route, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { api } from '../services/api';

const stops = [
  {name:'Dimapur Relief Hub',node:'Dimapur',priority:'CRITICAL'},
  {name:'Kohima District Hospital',node:'Kohima',priority:'CRITICAL'},
  {name:'Imphal Medical Store',node:'Imphal',priority:'HIGH'},
  {name:'Silchar Supply Depot',node:'Silchar',priority:'NORMAL'},
  {name:'Aizawl Community Store',node:'Aizawl',priority:'HIGH'},
  {name:'Shillong Relief Point',node:'Shillong',priority:'NORMAL'},
];

export default function MissionControl() {
  const [origin,setOrigin] = useState('Guwahati');
  const [selected,setSelected] = useState<string[]>(['Dimapur Relief Hub','Kohima District Hospital','Imphal Medical Store']);
  const [priority,setPriority] = useState('CRITICAL');
  const [mission,setMission] = useState<any>(null);
  const [hazard,setHazard] = useState('LANDSLIDE');
  const [severity,setSeverity] = useState('HIGH');
  const [district,setDistrict] = useState('Dima Hasao');
  const [playbook,setPlaybook] = useState<any>(null);
  const [completed,setCompleted] = useState<number[]>([]);
  const [error,setError] = useState('');
  async function optimize() { setError(''); try { const chosen=stops.filter(s=>selected.includes(s.name)); const r=await api.post('/missions/optimize',{origin,stops:chosen,cargo_priority:priority}); setMission(r.data); } catch { setError('Mission service unavailable. Confirm that the backend is running and you are signed in.'); } }
  async function generate() { setError(''); try { const r=await api.post('/response/playbook',{hazard,severity,district}); setPlaybook(r.data); setCompleted([]); } catch { setError('Playbook service unavailable. Confirm that the backend is running and you are signed in.'); } }
  function exportPlaybook() { if (!playbook) return; const blob=new Blob([JSON.stringify({...playbook,completed_steps:completed},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ne-route-response-playbook.json'; a.click(); URL.revokeObjectURL(url); }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">FIELD OPERATIONS / RELIEF COORDINATION</div><h1>Mission Control</h1><p>Coordinate critical cargo across multiple destinations and prepare structured response checklists.</p></div><span className="notice simulated compact"><Sparkles size={14}/> Planning recommendations · SIMULATED</span></div>
    {error && <div className="notice warning">{error}</div>}
    <div className="two-column mission-columns">
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">MULTI-STOP LOGISTICS</span><h2>Relief mission optimizer</h2></div><Route size={20}/></div>
        <label className="field-label">Mission origin<select value={origin} onChange={e=>setOrigin(e.target.value)}>{['Guwahati','Dimapur','Silchar','Shillong'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field-label">Cargo priority<select value={priority} onChange={e=>setPriority(e.target.value)}>{['CRITICAL','HIGH','NORMAL','LOW'].map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="field-label">Delivery destinations <span className="muted">Choose up to six stops</span></div>
        <div className="stop-picker">{stops.map(s=><label className="stop-option" key={s.name}><input type="checkbox" checked={selected.includes(s.name)} onChange={e=>setSelected(old=>e.target.checked?[...old,s.name]:old.filter(x=>x!==s.name))}/><span><b>{s.name}</b><small>{s.node} · {s.priority}</small></span><MapPin size={16}/></label>)}</div>
        <button className="button primary full" onClick={optimize} disabled={!selected.length}><Sparkles size={16}/> Optimize relief mission</button>
        {mission && <div className="mission-result"><div className="scenario-caption">OPTIMIZED STOP SEQUENCE · HEURISTIC</div><div className="mission-metrics"><div><b>{mission.distance_km} km</b><small>Total distance</small></div><div><b>{mission.eta_minutes} min</b><small>Estimated time</small></div><div><b>{mission.mean_route_risk}/100</b><small>Mean route risk</small></div></div><ol className="mission-order">{mission.stop_order.map((s:any,i:number)=><li key={s.node}><span>{i+1}</span><div><b>{s.name}</b><small>{s.priority} · {s.node}</small></div></li>)}</ol>{mission.unreachable_stops?.length>0&&<div className="notice warning">Unreachable stops: {mission.unreachable_stops.join(', ')}</div>}<div className="notice simulated compact"><ShieldCheck size={14}/> Human approval required before operational use.</div></div>}
      </section>
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">INCIDENT COMMAND</span><h2>Response playbook</h2></div><ClipboardList size={20}/></div>
        <label className="field-label">Hazard type<select value={hazard} onChange={e=>setHazard(e.target.value)}>{['FLOOD','LANDSLIDE','DAMAGED_BRIDGE','ROAD_CLOSURE','DAMAGED_ROAD'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field-label">Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}>{['LOW','MEDIUM','HIGH','CRITICAL'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field-label">District<input value={district} onChange={e=>setDistrict(e.target.value)} /></label>
        <button className="button secondary full" onClick={generate}><ClipboardList size={16}/> Generate response checklist</button>
        {playbook && <div className="playbook"><div className="scenario-caption">{playbook.hazard} · {playbook.severity} · {playbook.district}</div>{playbook.checklist.map((step:any)=><label className="check-step" key={step.step}><input type="checkbox" checked={completed.includes(step.step)} onChange={e=>setCompleted(old=>e.target.checked?[...old,step.step]:old.filter(x=>x!==step.step))}/><span><b>{step.action}</b><small>{step.owner_role} · target {step.target_minutes} min · {step.urgency}</small><em>Evidence: {step.evidence_required}</em></span></label>)}<div className="playbook-footer"><span>{completed.length}/{playbook.checklist.length} checklist steps checked</span><button className="button secondary small" onClick={exportPlaybook}><Download size={14}/> Export JSON</button></div><p className="safety-note">{playbook.safety_notice}</p></div>}
      </section>
    </div>
    <div className="notice info"><Truck size={16}/> The mission optimizer uses a nearest-neighbour heuristic with a bounded 2-opt improvement pass. It does not guarantee a globally optimal vehicle-routing solution; all route and response actions require authorized review.</div>
  </div>;
}
