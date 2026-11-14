import { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Bell, Clock3, Download, Package, RadioTower, Search, ShieldAlert, Truck, X } from 'lucide-react';

type Page='overview'|'briefing'|'map'|'routes'|'shipments'|'vehicles'|'incidents'|'alerts'|'copilot'|'risk'|'missions'|'digital-twin'|'system';
type Category='incident'|'alert'|'shipment'|'vehicle';
type Filter='all'|Category;
type Signal={key:string;category:Category;title:string;detail:string;status:string;priority:string;timestamp:number|null;stamp:string;page:Page;reference:string};
type Props={incidents:any[];alerts:any[];shipments:any[];vehicles:any[];apiStatus:'CHECKING'|'CONNECTED'|'OFFLINE';lastUpdated:Date|null;onNavigate:(page:Page)=>void};
const value=(v:unknown,fallback='Not provided')=>v===null||v===undefined||String(v).trim()===''?fallback:String(v);
const parseTime=(record:any)=>{const raw=record.updated_at||record.reported_at||record.triggered_at||record.created_at||record.timestamp;if(raw===null||raw===undefined)return null;const numeric=typeof raw==='number'?raw:Number.NaN;const parsed=Number.isFinite(numeric)?new Date(numeric<1e12?numeric*1000:numeric).getTime():Date.parse(String(raw));return Number.isFinite(parsed)?parsed:null;};
const formatTime=(stamp:number|null)=>stamp===null?'Timestamp not supplied':new Date(stamp).toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const tone=(raw:string)=>{const s=raw.toUpperCase();if(/CRITICAL|BLOCK|DELAY|REJECT|OFFLINE|HIGH|FAULT/.test(s))return 'danger';if(/PENDING|OPEN|REVIEW|WARN|CAUTION|HOLD/.test(s))return 'warning';if(/VERIFIED|ACTIVE|IN_TRANSIT|DELIVERED|RESOLVED|COMPLETED|AVAILABLE/.test(s))return 'good';return 'neutral';};
const csvCell=(input:unknown)=>'"'+String(input??'').replace(/\u0022/g,'\u0022\u0022')+'"';

export default function OperationsSignalStream({incidents,alerts,shipments,vehicles,apiStatus,lastUpdated,onNavigate}:Props){
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [showAll,setShowAll]=useState(false);
  const rows=useMemo<Signal[]>(()=>{
    const mapped:Signal[]=[
      ...incidents.map((r:any,i:number)=>({key:String(r.id||r.report_code||`incident-${i}`),category:'incident' as const,title:value(r.incident_type,'Field incident'),detail:[r.report_code,r.district,r.description].filter(Boolean).join(' · '),status:value(r.status,'Unreviewed'),priority:value(r.severity,'Unclassified'),timestamp:parseTime(r),stamp:'',page:'incidents' as Page,reference:value(r.report_code,value(r.id,'Incident record'))})),
      ...alerts.map((r:any,i:number)=>({key:String(r.id||r.alert_code||`alert-${i}`),category:'alert' as const,title:value(r.title||r.alert_type||r.message,'Operational alert'),detail:[r.alert_code,r.district,r.message].filter(Boolean).join(' · '),status:value(r.status,'Unknown'),priority:value(r.severity,'Unclassified'),timestamp:parseTime(r),stamp:'',page:'alerts' as Page,reference:value(r.alert_code,value(r.id,'Alert record'))})),
      ...shipments.map((r:any,i:number)=>({key:String(r.id||r.shipment_code||`shipment-${i}`),category:'shipment' as const,title:value(r.shipment_code,'Shipment record'),detail:[r.cargo_type,r.origin&&r.destination?`${r.origin} → ${r.destination}`:r.destination].filter(Boolean).join(' · '),status:value(r.status,'Unknown'),priority:value(r.priority,'Normal'),timestamp:parseTime(r),stamp:'',page:'shipments' as Page,reference:value(r.shipment_code,value(r.id,'Shipment record'))})),
      ...vehicles.map((r:any,i:number)=>({key:String(r.id||r.vehicle_code||`vehicle-${i}`),category:'vehicle' as const,title:value(r.vehicle_code,'Vehicle record'),detail:[r.driver_name,r.shipment_code].filter(Boolean).join(' · '),status:value(r.status,'Unknown'),priority:'Fleet',timestamp:parseTime(r),stamp:'',page:'vehicles' as Page,reference:value(r.vehicle_code,value(r.id,'Vehicle record'))})),
    ];
    return mapped.sort((a,b)=>{if(a.timestamp===null&&b.timestamp===null)return a.category.localeCompare(b.category);if(a.timestamp===null)return 1;if(b.timestamp===null)return -1;return b.timestamp-a.timestamp;}).map(row=>({...row,stamp:formatTime(row.timestamp)}));
  },[incidents,alerts,shipments,vehicles]);
  const counts:Record<Filter,number>={all:rows.length,incident:rows.filter(r=>r.category==='incident').length,alert:rows.filter(r=>r.category==='alert').length,shipment:rows.filter(r=>r.category==='shipment').length,vehicle:rows.filter(r=>r.category==='vehicle').length};
  const visible=useMemo(()=>rows.filter(r=>(filter==='all'||r.category===filter)&&(!query.trim()||[r.title,r.detail,r.status,r.priority,r.reference].join(' ').toLowerCase().includes(query.trim().toLowerCase()))),[rows,filter,query]);
  const displayed=showAll?visible:visible.slice(0,5);
  const exportRows=()=>{const header=['Category','Reference','Title','Details','Status','Priority','Timestamp'];const lines=[header,...visible.map(r=>[r.category,r.reference,r.title,r.detail,r.status,r.priority,r.stamp])].map(row=>row.map(csvCell).join(','));const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='ne-route-operations-signals.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);};
  const filters:[Filter,string,any][]=[['all','All signals',Activity],['incident','Incidents',ShieldAlert],['alert','Alerts',Bell],['shipment','Cargo',Package],['vehicle','Fleet',Truck]];
  const statusLabel=apiStatus==='CONNECTED'?'SOURCE CONNECTED':apiStatus==='OFFLINE'?'SOURCE OFFLINE':'CHECKING SOURCE';

  return <section className="signal-stream" aria-label="Operations signal stream">
    <div className="signal-stream-head">
      <div><span className="eyebrow">CROSS-WORKSPACE INTELLIGENCE / RECORD FEED</span><h2>Operations signal stream</h2><p>One searchable feed across incidents, alerts, cargo and fleet records.</p></div>
      <div className="signal-source-state"><span className={`signal-source-dot ${apiStatus.toLowerCase()}`}/><span><b>{statusLabel}</b><small>{lastUpdated?lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'Awaiting successful sync'}</small></span></div>
    </div>
    <div className="signal-stream-toolbar">
      <div className="signal-stream-filters" role="tablist" aria-label="Signal categories">
        {filters.map(([key,label,Icon])=><button key={key} role="tab" aria-selected={filter===key} className={filter===key?'active':''} onClick={()=>{setFilter(key);setShowAll(false);}}><Icon size={13}/><span>{label}</span><b>{counts[key]}</b></button>)}
      </div>
      <div className="signal-stream-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search signals or references…" aria-label="Search operations signals"/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X size={13}/></button>}</div>
    </div>
    <div className="signal-stream-meta"><span>{visible.length} matching records</span><button onClick={exportRows} disabled={!visible.length}><Download size={13}/> Export filtered CSV</button></div>
    {displayed.length===0?<div className="signal-stream-empty"><div><RadioTower size={20}/></div><b>No signals match this view</b><span>Try another category or clear your search.</span><button onClick={()=>{setQuery('');setFilter('all');}}>Reset view</button></div>:
      <div className="signal-stream-list">
        {displayed.map((row,index)=>{const Icon=row.category==='incident'?ShieldAlert:row.category==='alert'?Bell:row.category==='shipment'?Package:Truck;return <button className="signal-stream-row" key={row.key} onClick={()=>onNavigate(row.page)}>
          <span className={`signal-stream-index ${row.category}`}>{String(index+1).padStart(2,'0')}</span>
          <span className={`signal-stream-icon ${row.category}`}><Icon size={15}/></span>
          <span className="signal-stream-copy"><span className="signal-stream-type">{row.category.toUpperCase()} · {row.reference}</span><b>{row.title}</b><small>{row.detail||'No additional description supplied'}</small></span>
          <span className="signal-stream-status-wrap"><em className={`signal-stream-status ${tone(row.status)}`}>{row.status.replaceAll('_',' ')}</em><small><Clock3 size={11}/>{row.stamp}</small></span>
          <ArrowUpRight size={14} className="signal-stream-arrow"/>
        </button>;})}
      </div>}
    {visible.length>5&&<button className="signal-stream-more" onClick={()=>setShowAll(v=>!v)}>{showAll?'Show fewer records':`Show all ${visible.length} matching records`} <ArrowUpRight size={13}/></button>}
    <div className="signal-stream-foot"><span><i/> RECORD-BASED VIEW</span><span>Only supplied record timestamps are shown. Missing timestamps are not inferred.</span></div>
  </section>;
}
