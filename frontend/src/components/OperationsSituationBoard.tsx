import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, Gauge, MapPin, Package, Search, ShieldAlert, Truck, Waypoints } from 'lucide-react';

type Page = 'overview'|'briefing'|'map'|'routes'|'shipments'|'vehicles'|'incidents'|'alerts'|'copilot'|'risk'|'missions'|'digital-twin'|'system';
type Props = { shipments:any[]; vehicles:any[]; districts:any[]; onNavigate:(page:Page)=>void };
type Tab = 'shipments'|'fleet'|'districts';
type Scope = 'all'|'attention';
const safeText=(value:unknown,fallback='—')=>value===null||value===undefined||String(value).trim()===''?fallback:String(value);
const attentionStatus=(value:unknown)=>/(DELAY|LATE|RISK|BLOCK|FAULT|OFFLINE|MAINT|HOLD|PENDING)/i.test(String(value||''));
const tone=(value:unknown)=>{const v=String(value||'').toUpperCase();if(/CRITICAL|BLOCK|DELAY|OFFLINE|HIGH|FAULT/.test(v))return 'danger';if(/WARN|PENDING|CAUTION|REVIEW|HOLD/.test(v))return 'warning';if(/IN_TRANSIT|ACTIVE|VERIFIED|AVAILABLE|DELIVERED|COMPLETED/.test(v))return 'good';return 'neutral';};

export default function OperationsSituationBoard({shipments,vehicles,districts,onNavigate}:Props){
  const [tab,setTab]=useState<Tab>('shipments');
  const [scope,setScope]=useState<Scope>('all');
  const [query,setQuery]=useState('');
  const source=tab==='shipments'?shipments:tab==='fleet'?vehicles:districts;
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return source.filter((item:any)=>{
      const haystack=tab==='shipments'
        ? [item.shipment_code,item.cargo_type,item.origin,item.destination,item.priority,item.status].join(' ')
        : tab==='fleet'
          ? [item.vehicle_code,item.driver_name,item.status,item.shipment_code].join(' ')
          : [item.name,item.state,item.accessibility_score].join(' ');
      const matchesQuery=!q||haystack.toLowerCase().includes(q);
      const score=Number(item.accessibility_score);
      const isAttention=tab==='shipments'
        ? attentionStatus(item.status)||['CRITICAL','HIGH'].includes(String(item.priority||'').toUpperCase())||(Number.isFinite(Number(item.eta_minutes))&&Number.isFinite(Number(item.deadline_minutes))&&Number(item.eta_minutes)>Number(item.deadline_minutes))
        : tab==='fleet'
          ? attentionStatus(item.status)
          : Number.isFinite(score)&&score<70;
      return matchesQuery&&(scope==='all'||isAttention);
    }).slice(0,6);
  },[source,tab,scope,query]);
  const counts={
    shipments:shipments.length,
    fleet:vehicles.length,
    districts:districts.length,
  };
  const viewPage:Page=tab==='shipments'?'shipments':tab==='fleet'?'vehicles':'risk';
  const tabs:[Tab,string,any][]=[['shipments','Priority cargo',Package],['fleet','Fleet status',Truck],['districts','District pulse',Waypoints]];
  const tabCopy:Record<Tab,string>={shipments:'Cargo movements and delivery commitments',fleet:'Vehicle availability and assignment snapshot',districts:'Accessibility indicators across monitored districts'};
  const attentionCount=tab==='shipments'
    ? shipments.filter(x=>attentionStatus(x.status)||['CRITICAL','HIGH'].includes(String(x.priority||'').toUpperCase())||(Number.isFinite(Number(x.eta_minutes))&&Number.isFinite(Number(x.deadline_minutes))&&Number(x.eta_minutes)>Number(x.deadline_minutes))).length
    : tab==='fleet'?vehicles.filter(x=>attentionStatus(x.status)).length:districts.filter(x=>Number(x.accessibility_score)<70).length;

  return <section className="situation-board" aria-label="Operations situation board">
    <div className="situation-board-head">
      <div><span className="eyebrow">OPERATIONAL WORKBENCH / LIVE SNAPSHOT</span><h2>Situation board</h2><p>{tabCopy[tab]}</p></div>
      <div className="situation-board-badge"><span className="situation-pulse"/>API SNAPSHOT <small>12 SEC REFRESH</small></div>
    </div>
    <div className="situation-toolbar">
      <div className="situation-tabs" role="tablist" aria-label="Situation board categories">
        {tabs.map(([key,label,Icon])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>{setTab(key);setScope('all');setQuery('');}}>
          <Icon size={14}/><span>{label}</span><b>{counts[key].toString().padStart(2,'0')}</b>
        </button>)}
      </div>
      <div className="situation-search"><Search size={14}/><input aria-label="Search situation board" placeholder={tab==='districts'?'Search districts…':'Search records…'} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}>×</button>}</div>
    </div>
    <div className="situation-board-controls">
      <div className="situation-filter" role="group" aria-label="Filter records">
        <button className={scope==='all'?'active':''} onClick={()=>setScope('all')}>All records</button>
        <button className={scope==='attention'?'active':''} onClick={()=>setScope('attention')}><ShieldAlert size={12}/> Needs attention <b>{attentionCount}</b></button>
      </div>
      <button className="situation-view-all" onClick={()=>onNavigate(viewPage)}>Open full workspace <ArrowUpRight size={13}/></button>
    </div>

    {filtered.length===0?<div className="situation-empty"><div><Search size={20}/></div><b>No matching records</b><span>Try another search or switch back to all records.</span><button onClick={()=>{setQuery('');setScope('all');}}>Clear filters</button></div>:
      <div className={`situation-record-grid ${tab}`}>
        {filtered.map((item:any,index:number)=>{
          if(tab==='shipments'){
            const eta=Number(item.eta_minutes);
            const deadline=Number(item.deadline_minutes);
            const late=Number.isFinite(eta)&&Number.isFinite(deadline)&&eta>deadline;
            return <button className="situation-record shipment-record" key={item.id||item.shipment_code||index} onClick={()=>onNavigate('shipments')}>
              <span className="situation-record-top"><span className="situation-record-icon cargo"><Package size={15}/></span><span className={`situation-status ${tone(late?'DELAYED':item.status)}`}>{late?'DEADLINE RISK':safeText(item.status,'UNKNOWN').replaceAll('_',' ')}</span></span>
              <span className="situation-record-title">{safeText(item.shipment_code,'Unreferenced cargo')}</span>
              <span className="situation-record-sub">{safeText(item.cargo_type,'Essential cargo')} · {safeText(item.priority,'NORMAL')} priority</span>
              <span className="situation-route"><span>{safeText(item.origin)}</span><i/><span>{safeText(item.destination)}</span></span>
              <span className="situation-record-footer"><span><Clock3 size={12}/> ETA <b>{Number.isFinite(eta)?eta+' min':'—'}</b></span><span className={late?'risk-text':''}>Deadline <b>{Number.isFinite(deadline)?deadline+' min':'—'}</b></span><ArrowUpRight size={13}/></span>
            </button>;
          }
          if(tab==='fleet'){
            const status=safeText(item.status,'UNKNOWN').replaceAll('_',' ');
            return <button className="situation-record fleet-record" key={item.id||item.vehicle_code||index} onClick={()=>onNavigate('vehicles')}>
              <span className="situation-record-top"><span className="situation-record-icon fleet"><Truck size={15}/></span><span className={`situation-status ${tone(status)}`}>{status}</span></span>
              <span className="situation-record-title">{safeText(item.vehicle_code,'Unidentified vehicle')}</span>
              <span className="situation-record-sub">{safeText(item.driver_name,'Driver not assigned')}</span>
              <span className="fleet-assignment"><Package size={12}/>{safeText(item.shipment_code,'No shipment assigned')}</span>
              <span className="situation-record-footer"><span><Gauge size={12}/> Speed <b>{item.speed_kmph===null||item.speed_kmph===undefined?'—':item.speed_kmph+' km/h'}</b></span><span>Fleet record</span><ArrowUpRight size={13}/></span>
            </button>;
          }
          const score=Number(item.accessibility_score);
          const scoreTone=score>=75?'good':score>=60?'warning':'danger';
          return <button className="situation-record district-record" key={item.id||item.name||index} onClick={()=>onNavigate('risk')}>
            <span className="situation-record-top"><span className="situation-record-icon district"><MapPin size={15}/></span><span className={`situation-status ${scoreTone}`}>{score>=75?'RESILIENT':score>=60?'WATCH':'LOW ACCESS'}</span></span>
            <span className="situation-record-title">{safeText(item.name,'Unnamed district')}</span>
            <span className="situation-record-sub">{safeText(item.state,'North East region')}</span>
            <span className="district-score-row"><b>{Number.isFinite(score)?score:'—'}</b><small>/ 100 accessibility</small><span className="district-score-track"><i style={{width:`${Math.max(0,Math.min(100,Number.isFinite(score)?score:0))}%`}}/></span></span>
            <span className="situation-record-footer"><span><Activity size={12}/> District indicator</span><span>Open analysis</span><ArrowUpRight size={13}/></span>
          </button>;
        })}
      </div>}
    <div className="situation-board-foot"><span><span className="situation-foot-dot"/> DATA-AWARE VIEW</span><span>Indicators reflect returned records; low scores are screening signals, not official access guarantees.</span></div>
  </section>;
}
