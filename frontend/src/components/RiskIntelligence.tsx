import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, CloudRain, Download, Gauge, RadioTower, ShieldCheck, Truck, Waves } from 'lucide-react';
import { api } from '../services/api';

type Snapshot = {
  data_mode: string;
  network: { resilience_index:number; total_segments:number; blocked_segments:number; high_risk_segments:number; average_risk:number; risk_distribution:Record<string,number> };
  corridor_watchlist:Array<{id:string;name:string;status:string;risk_score:number;district_context:string;explanation:string;distance_km:number}>;
  cargo_exposure:Array<{shipment_code:string;cargo_type:string;priority:string;origin:string;destination:string;status:string;eta_minutes:number;deadline_minutes:number;risk_score:number;delay_risk:boolean}>;
  fleet:{vehicles:number;in_transit:number;delayed:number;gps_stale:string[];gps_stale_count:number};
  response_queue:Array<{id:string;title:string;status:string;severity:string;risk_score:number;recommended_action:string}>;
  districts:Array<{name:string;state:string;accessibility_score:number}>;
  summary:{active_incidents:number;open_alerts:number;delayed_shipments:number};
};
const fallback: Snapshot = {data_mode:'SIMULATED',network:{resilience_index:68,total_segments:12,blocked_segments:1,high_risk_segments:3,average_risk:46,risk_distribution:{SAFE:4,CAUTION:4,HIGH_RISK:3,BLOCKED:1}},corridor_watchlist:[],cargo_exposure:[],fleet:{vehicles:3,in_transit:2,delayed:1,gps_stale:[],gps_stale_count:0},response_queue:[],districts:[],summary:{active_incidents:2,open_alerts:1,delayed_shipments:1}};
const pct = (v:number) => `${Math.max(0,Math.min(100,v))}%`;
function Metric({label,value,sub,icon:Icon,tone='red'}:{label:string;value:string|number;sub:string;icon:any;tone?:string}) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={18}/></div><div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div></div></div>; }

export default function RiskIntelligence() {
  const [data,setData] = useState<Snapshot>(fallback);
  const [rain,setRain] = useState(1.5);
  const [bridge,setBridge] = useState(.2);
  const [horizon,setHorizon] = useState(6);
  const [scenario,setScenario] = useState<any>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  useEffect(() => { api.get('/analytics/intelligence').then(r => setData(r.data)).catch(() => setError('Showing seeded preview. Connect the API for current demo database values.')); }, []);
  const distribution = useMemo(() => Object.entries(data.network.risk_distribution),[data]);
  async function runScenario() { setBusy(true); setError(''); try { const r=await api.post('/analytics/scenario',{rainfall_multiplier:rain,bridge_vulnerability_delta:bridge,horizon_hours:horizon}); setScenario(r.data); } catch { setError('Scenario service unavailable. Current intelligence remains visible.'); } finally { setBusy(false); } }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">PREDICTIVE OPERATIONS / NETWORK RESILIENCE</div><h1>Risk Intelligence</h1><p>Explainable corridor exposure, cargo impact and non-persistent hazard scenarios.</p></div><a className="button secondary" href="http://localhost:8000/api/v1/analytics/export.csv" target="_blank" rel="noreferrer"><Download size={16}/> Export operations CSV</a></div>
    <div className="notice simulated"><RadioTower size={16}/> SIMULATED DATASET · Risk and accessibility values are prototype outputs, not official road-condition reports.</div>
    {error && <div className="notice warning">{error}</div>}
    <section className="metric-grid">
      <Metric label="Network resilience" value={`${data.network.resilience_index}/100`} sub="Heuristic network indicator" icon={ShieldCheck}/>
      <Metric label="Blocked segments" value={data.network.blocked_segments} sub="Operational closure flags" icon={AlertTriangle}/>
      <Metric label="High-risk corridors" value={data.network.high_risk_segments} sub="Risk score ≥ 65" icon={Activity}/>
      <Metric label="Critical cargo exposure" value={data.cargo_exposure.length} sub="Shipments requiring review" icon={Truck}/>
      <Metric label="Fleet GPS stale" value={data.fleet.gps_stale_count} sub="No recent position signal" icon={RadioTower}/>
      <Metric label="Open response alerts" value={data.summary.open_alerts} sub="Awaiting acknowledgement" icon={Waves}/>
    </section>
    <div className="two-column">
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">NETWORK HEALTH</span><h2>Risk distribution</h2></div><Gauge size={19}/></div>
        <div className="distribution-list">{distribution.map(([key,value]) => <div className="distribution-row" key={key}><span>{key.replace('_',' ')}</span><div className="distribution-track"><span className={`distribution-fill ${key.toLowerCase()}`} style={{width:pct(data.network.total_segments ? value/data.network.total_segments*100 : 0)}}/></div><b>{value}</b></div>)}</div>
        <div className="resilience-footer"><span>Average segment risk</span><strong>{data.network.average_risk}/100</strong></div>
      </section>
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">WHAT-IF ANALYSIS</span><h2>Scenario laboratory</h2></div><CloudRain size={19}/></div>
        <label className="range-label">Rainfall multiplier <b>{rain.toFixed(1)}×</b><input type="range" min="0.5" max="3" step="0.1" value={rain} onChange={e=>setRain(Number(e.target.value))}/></label>
        <label className="range-label">Bridge vulnerability increase <b>{Math.round(bridge*100)}%</b><input type="range" min="0" max="0.8" step="0.05" value={bridge} onChange={e=>setBridge(Number(e.target.value))}/></label>
        <label className="range-label">Forecast horizon <b>{horizon} hours</b><input type="range" min="1" max="72" step="1" value={horizon} onChange={e=>setHorizon(Number(e.target.value))}/></label>
        <button className="button primary full" onClick={runScenario} disabled={busy}>{busy?'Projecting…':'Run stress-test scenario'}</button>
        {scenario && <div className="scenario-results"><div className="scenario-caption">NON-PERSISTENT PROJECTION · {scenario.projections.length} segments</div>{scenario.projections.slice(0,4).map((item:any)=><div className="scenario-row" key={item.segment_id}><span>{item.name}</span><b>{item.current_risk} → {item.projected_risk}</b><em>+{item.change}</em></div>)}</div>}
      </section>
    </div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">CORRIDOR EXPOSURE</span><h2>Priority watchlist</h2></div><span className="panel-count">{data.corridor_watchlist.length} segments</span></div>
      <div className="table-wrap"><table><thead><tr><th>Corridor</th><th>Operational state</th><th>Risk score</th><th>Distance</th><th>Key drivers</th></tr></thead><tbody>{data.corridor_watchlist.map(x=><tr key={x.id}><td><b>{x.name}</b><small>{x.district_context}</small></td><td><span className={`status-pill ${x.status==='CLOSED'?'danger':'neutral'}`}>{x.status}</span></td><td><b className={x.risk_score>=65?'risk-high':'risk-medium'}>{x.risk_score}/100</b></td><td>{x.distance_km} km</td><td className="driver-cell">{x.explanation}</td></tr>)}</tbody></table></div>
    </section>
    <div className="two-column"><section className="panel"><div className="panel-head"><div><span className="eyebrow">ESSENTIAL SUPPLY</span><h2>Cargo exposure</h2></div><Truck size={19}/></div>{data.cargo_exposure.length?data.cargo_exposure.map(x=><div className="list-row" key={x.shipment_code}><div><b>{x.shipment_code}</b><small>{x.cargo_type} · {x.origin} → {x.destination}</small></div><div className="align-right"><b>{x.eta_minutes} min</b><small>{x.priority} · {x.status}</small></div></div>):<div className="empty-state">No cargo exposure in the current snapshot.</div>}</section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">FIELD COORDINATION</span><h2>Response queue</h2></div><ArrowUpRight size={19}/></div>{data.response_queue.length?data.response_queue.map(x=><div className="queue-item" key={x.id}><div className="queue-score">{x.risk_score}</div><div><b>{x.title}</b><small>{x.severity} · {x.status}</small><p>{x.recommended_action}</p></div></div>):<div className="empty-state">No open response alerts.</div>}</section></div>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">DISTRICT ACCESSIBILITY</span><h2>District resilience overview</h2></div></div><div className="district-grid">{data.districts.map(d=><div className="district-tile" key={d.name}><span>{d.name}</span><b>{d.accessibility_score}</b><div className="mini-track"><span style={{width:pct(d.accessibility_score)}}/></div><small>{d.state}</small></div>)}</div></section>
  </div>;
}
