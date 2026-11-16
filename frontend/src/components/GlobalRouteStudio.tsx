import { useEffect, useState } from 'react';
import {
  ArrowDownUp, ArrowRight, Check, ChevronDown, CircleDollarSign, Clock3, Cloud,
  Compass, Gauge, Globe2, Leaf, MapPin, Network, Package, Plane, Route, ShieldCheck,
  Ship, Truck, X,
} from 'lucide-react';

export const NETWORK_REGIONS: Array<{ label:string; nodes:string[] }> = [
  {label:'North East India',nodes:['Guwahati','Nagaon','Dimapur','Kohima','Imphal','Silchar','Aizawl','Shillong','Gangtok','Itanagar','Agartala','Dibrugarh']},
  {label:'East Africa',nodes:['Mombasa','Nairobi','Eldoret','Kampala','Juba','Arusha','Dodoma']},
  {label:'Southeast Asia',nodes:['Bangkok','Phnom Penh','Ho Chi Minh City','Vientiane','Hanoi','Yangon']},
  {label:'Andes',nodes:['Lima','Huancayo','Cusco','Arequipa','La Paz']},
];

type Segment={id?:string;name:string;mode?:string;distance_km?:number;risk_score?:number;status?:string};
type Option={objective:string;available:boolean;segments:Segment[];distance_km:number;eta_minutes:number|null;mean_risk_score:number|null;max_risk_score:number|null;cost_usd:number|null;co2_kg:number|null;modes?:string[]};
type Result={origin:string;destination:string;cargo_priority:string;options:Option[];data_mode?:string};
type Props={origin:string;destination:string;priority:string;route:Result|null;loading:boolean;onOriginChange:(value:string)=>void;onDestinationChange:(value:string)=>void;onPriorityChange:(value:string)=>void;onPlan:()=>void};

const strategies:Record<string,{title:string;subtitle:string;icon:any;accent:string}> = {
  FASTEST:{title:'Fastest',subtitle:'Minimize estimated transit time',icon:Clock3,accent:'blue'},
  SAFEST:{title:'Safest',subtitle:'Reduce exposure to high-risk corridors',icon:ShieldCheck,accent:'green'},
  PRIORITY:{title:'Priority cargo',subtitle:'Balance time and corridor risk for essential supplies',icon:Package,accent:'amber'},
  GREENEST:{title:'Lowest emissions',subtitle:'Minimize estimated transport emissions',icon:Leaf,accent:'teal'},
};
const modeInfo:Record<string,{label:string;icon:any}> = {ROAD:{label:'Road',icon:Truck},AIR:{label:'Air bridge',icon:Plane},SEA:{label:'Sea lane',icon:Ship}};
const number=(value:number|null|undefined,decimals=0)=>value==null?'—':value.toLocaleString(undefined,{maximumFractionDigits:decimals});
const duration=(minutes:number|null|undefined)=>{
  if(minutes==null)return 'No viable route';
  const days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),mins=minutes%60;
  return [days?days+'d':null,hours?hours+'h':null,mins?mins+'m':null].filter(Boolean).join(' ')||'0m';
};
const titleCase=(value:string)=>value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

export default function GlobalRouteStudio({origin,destination,priority,route,loading,onOriginChange,onDestinationChange,onPriorityChange,onPlan}:Props){
  const [selectedObjective,setSelectedObjective]=useState('FASTEST');
  const [showAllLegs,setShowAllLegs]=useState(false);
  const available=route?.options?.filter(option=>option.available)||[];
  const selected=available.find(option=>option.objective===selectedObjective)||available[0]||null;
  const maxCost=Math.max(1,...available.map(option=>option.cost_usd||0));
  const maxCarbon=Math.max(1,...available.map(option=>option.co2_kg||0));
  const fastest=available.reduce<Option|null>((best,item)=>!best||(item.eta_minutes??Infinity)<(best.eta_minutes??Infinity)?item:best,null);
  const greenest=available.reduce<Option|null>((best,item)=>!best||(item.co2_kg??Infinity)<(best.co2_kg??Infinity)?item:best,null);
  const safest=available.reduce<Option|null>((best,item)=>!best||(item.mean_risk_score??Infinity)<(best.mean_risk_score??Infinity)?item:best,null);
  const regionFor=(node:string)=>NETWORK_REGIONS.find(region=>region.nodes.includes(node))?.label||'Network node';
  const modeSet=selected?.segments?.length?[...new Set(selected.segments.map(segment=>segment.mode||'ROAD'))]:[];
  useEffect(()=>{if(route?.options?.length){const first=route.options.find(option=>option.available);setSelectedObjective(first?.objective||route.options[0].objective);setShowAllLegs(false);}},[route]);

  return <div className="page-stack route-studio">
    <section className="route-studio-hero">
      <div className="route-studio-hero-copy">
        <div className="route-studio-eyebrow"><Globe2 size={14}/> GLOBAL LOGISTICS NETWORK <span>·</span> MULTIMODAL DECISION SUPPORT</div>
        <h1>Route strategy studio</h1>
        <p>Compare four route objectives across connected regional networks. Inspect every road, air and sea leg before choosing a plan.</p>
        <div className="route-network-pills">{NETWORK_REGIONS.map(region=><span key={region.label}><i/>{region.label}</span>)}</div>
      </div>
      <div className="route-orbit-art" aria-hidden="true">
        <div className="route-orbit route-orbit-a"/><div className="route-orbit route-orbit-b"/>
        <span className="route-orbit-node route-node-a"><MapPin size={14}/></span>
        <span className="route-orbit-node route-node-b"><Plane size={14}/></span>
        <span className="route-orbit-node route-node-c"><Ship size={14}/></span>
        <span className="route-orbit-core"><Network size={27}/></span><small>CONNECTED WORLD</small>
      </div>
    </section>

    <section className="route-planner-panel panel">
      <div className="route-section-head">
        <div><span className="eyebrow">PLAN A MOVEMENT</span><h2>Origin and destination</h2></div>
        <span className="route-demo-badge"><Cloud size={13}/> Illustrative network</span>
      </div>
      <div className="route-input-grid">
        <label className="route-location-field">
          <span><i className="route-location-dot origin"/> ORIGIN</span>
          <select aria-label="Origin location" value={origin} onChange={event=>onOriginChange(event.target.value)}>
            {NETWORK_REGIONS.map(region=><optgroup key={region.label} label={region.label}>{region.nodes.map(node=><option key={node} value={node}>{node}</option>)}</optgroup>)}
          </select><small><MapPin size={12}/>{regionFor(origin)}</small>
        </label>
        <button className="route-swap-button" type="button" aria-label="Swap origin and destination" onClick={()=>{onOriginChange(destination);onDestinationChange(origin);}}><ArrowDownUp size={17}/></button>
        <label className="route-location-field">
          <span><i className="route-location-dot destination"/> DESTINATION</span>
          <select aria-label="Destination location" value={destination} onChange={event=>onDestinationChange(event.target.value)}>
            {NETWORK_REGIONS.map(region=><optgroup key={region.label} label={region.label}>{region.nodes.map(node=><option key={node} value={node}>{node}</option>)}</optgroup>)}
          </select><small><MapPin size={12}/>{regionFor(destination)}</small>
        </label>
        <label className="route-priority-field">
          <span>CARGO PRIORITY</span>
          <select aria-label="Cargo priority" value={priority} onChange={event=>onPriorityChange(event.target.value)}>
            {['CRITICAL','HIGH','NORMAL','LOW'].map(value=><option key={value}>{value}</option>)}
          </select><small><Package size={12}/> Applied to priority scoring</small>
        </label>
        <button className="button primary route-calculate-button" type="button" onClick={onPlan} disabled={loading||origin===destination}>
          {loading?<span className="route-spinner"/>:<Compass size={17}/>}
          {loading?'Calculating network…':'Compare route strategies'} <ArrowRight size={15}/>
        </button>
      </div>
      {origin===destination&&<div className="route-validation"><X size={13}/> Choose two different locations to calculate a route.</div>}
    </section>

    {!route&&!loading&&<section className="route-empty-state panel">
      <div className="route-empty-icon"><Route size={24}/></div><h2>Ready to compare the network</h2>
      <p>Choose any two locations. Cross-region plans can chain road corridors with humanitarian air bridges and sea lanes.</p>
      <div className="route-example-pairs">
        <button type="button" onClick={()=>{onOriginChange('Guwahati');onDestinationChange('Juba');}}>Guwahati <ArrowRight size={13}/> Juba <span>Intercontinental</span></button>
        <button type="button" onClick={()=>{onOriginChange('Mombasa');onDestinationChange('Ho Chi Minh City');}}>Mombasa <ArrowRight size={13}/> Ho Chi Minh City <span>Sea lane</span></button>
        <button type="button" onClick={()=>{onOriginChange('Lima');onDestinationChange('La Paz');}}>Lima <ArrowRight size={13}/> La Paz <span>Andes</span></button>
      </div>
    </section>}

    {loading&&<section className="route-loading-panel panel" aria-live="polite"><span className="route-spinner large"/><div><b>Evaluating the connected network</b><small>Scoring travel time, corridor risk, cost and estimated emissions…</small></div></section>}

    {route&&!loading&&<>
      <section className="route-result-summary">
        <div><span className="eyebrow">ROUTE COMPARISON</span><h2>{route.origin} <ArrowRight size={17}/> {route.destination}</h2><p>{regionFor(route.origin)} to {regionFor(route.destination)} · {titleCase(route.cargo_priority||priority)} cargo</p></div>
        <div className="route-result-count"><b>{available.length}<small>/4</small></b><span>strategies available</span></div>
      </section>
      {available.length===0?<section className="route-no-result panel"><Route size={24}/><h2>No viable path in this network snapshot</h2><p>The selected nodes do not currently connect through the modeled road, air and sea links.</p></section>:<>
        <div className="route-award-strip">
          {fastest&&<div><span className="route-award-icon blue"><Clock3 size={15}/></span><span><small>FASTEST OPTION</small><b>{titleCase(fastest.objective)} · {duration(fastest.eta_minutes)}</b></span></div>}
          {safest&&<div><span className="route-award-icon green"><ShieldCheck size={15}/></span><span><small>LOWEST MEAN RISK</small><b>{number(safest.mean_risk_score,1)}/100</b></span></div>}
          {greenest&&<div><span className="route-award-icon teal"><Leaf size={15}/></span><span><small>LOWEST EMISSIONS</small><b>{number(greenest.co2_kg,1)} kg CO₂</b></span></div>}
        </div>
        <section className="route-options-section">
          <div className="route-section-head"><div><span className="eyebrow">STRATEGY MATRIX</span><h2>Choose a route objective</h2></div><span className="route-options-hint">Select a card to inspect its legs</span></div>
          <div className="route-option-grid">
            {route.options.map(option=>{
              const meta=strategies[option.objective]||{title:titleCase(option.objective),subtitle:'Route objective',icon:Route,accent:'blue'};
              const Icon=meta.icon;const isSelected=selected?.objective===option.objective;
              return <button type="button" key={option.objective} className={'route-option-card '+meta.accent+(isSelected?' selected':'')+(!option.available?' unavailable':'')} onClick={()=>option.available&&setSelectedObjective(option.objective)} disabled={!option.available} aria-pressed={isSelected}>
                <div className="route-option-top"><span className={'route-option-icon '+meta.accent}><Icon size={17}/></span>{isSelected?<span className="route-selected-tag"><Check size={11}/> Selected</span>:<span className="route-option-arrow"><ArrowRight size={14}/></span>}</div>
                <span className="route-option-name">{meta.title}</span><small className="route-option-subtitle">{meta.subtitle}</small>
                {option.available?<>
                  <b className="route-option-time">{duration(option.eta_minutes)}</b>
                  <div className="route-option-metrics"><span><Gauge size={12}/>{number(option.mean_risk_score,1)} risk</span><span><CircleDollarSign size={12}/>{option.cost_usd==null?'—':'$'+number(option.cost_usd,0)}</span><span><Leaf size={12}/>{number(option.co2_kg,1)} kg</span></div>
                  <div className="route-option-foot"><span>{number(option.distance_km,1)} km</span><span>{(option.modes||[]).map(mode=>modeInfo[mode]?.label||mode).join(' + ')||'ROAD'}</span></div>
                  <div className="route-option-bars"><i style={{width:(option.cost_usd==null?0:option.cost_usd/maxCost*100)+'%'}}/><i style={{width:(option.co2_kg==null?0:option.co2_kg/maxCarbon*100)+'%'}}/></div>
                  <small className="route-bar-caption">Relative cost / emissions</small>
                </>:<div className="route-unavailable-note">No connected path for this objective</div>}
              </button>;
            })}
          </div>
        </section>
        {selected&&<section className="route-detail-panel panel">
          <div className="route-detail-head">
            <div><span className="eyebrow">SELECTED ROUTE · {selected.objective}</span><h2>{selected.segments.length} transport legs <span>·</span> {number(selected.distance_km,1)} km</h2></div>
            <div className="route-detail-modes">{modeSet.map(mode=>{const Icon=modeInfo[mode]?.icon||Truck;return <span key={mode} className={'mode-chip '+String(mode).toLowerCase()}><Icon size={13}/>{modeInfo[mode]?.label||mode}</span>;})}</div>
          </div>
          <div className="route-leg-list">
            {(showAllLegs?selected.segments:selected.segments.slice(0,5)).map((segment,index)=>{
              const mode=segment.mode||'ROAD',Icon=modeInfo[mode]?.icon||Truck;
              return <div className="route-leg-row" key={segment.id||segment.name+'-'+index}>
                <div className="route-leg-index"><b>{String(index+1).padStart(2,'0')}</b><span/></div>
                <div className={'route-leg-mode '+String(mode).toLowerCase()}><Icon size={16}/></div>
                <div className="route-leg-copy"><b>{segment.name}</b><small>{modeInfo[mode]?.label||mode} segment · {number(segment.distance_km,1)} km</small></div>
                <span className={'route-leg-risk '+(Number(segment.risk_score)>=65?'high':Number(segment.risk_score)>=35?'medium':'low')}>{number(segment.risk_score)}/100 risk</span>
                <span className={'route-leg-status '+String(segment.status||'').toLowerCase()}>{titleCase(segment.status||'UNKNOWN')}</span>
              </div>;
            })}
          </div>
          {selected.segments.length>5&&<button type="button" className="route-show-legs" onClick={()=>setShowAllLegs(value=>!value)}>{showAllLegs?'Show fewer legs':'Show all '+selected.segments.length+' legs'} <ChevronDown size={14}/></button>}
          <div className="route-detail-footer">
            <div><small>ESTIMATED TOTAL COST</small><b>{selected.cost_usd==null?'Not available':'$'+number(selected.cost_usd,2)}</b></div>
            <div><small>ESTIMATED CO₂</small><b>{selected.co2_kg==null?'Not available':number(selected.co2_kg,1)+' kg'}</b></div>
            <div><small>MEAN CORRIDOR RISK</small><b>{number(selected.mean_risk_score,1)}/100</b></div>
            <div><small>MAX CORRIDOR RISK</small><b>{number(selected.max_risk_score,1)}/100</b></div>
          </div>
        </section>}
      </>}
      <div className="route-method-note"><ShieldCheck size={15}/><span>Decision support only. Distances, ETAs, transport links, freight costs and CO₂ factors are synthetic scenario estimates, not live carrier quotes or dispatch instructions.</span></div>
    </>}
  </div>;
}
