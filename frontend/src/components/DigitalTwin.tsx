import { useEffect,useState } from 'react';
import { Activity,ArrowRight,BadgeCheck,Boxes,CheckCircle2,Clock3,GitBranch,MapPinned,Network,PackageSearch,RadioTower,ShieldAlert,ShieldCheck,Sparkles,Waves } from 'lucide-react';
import { api } from '../services/api';

type Tab='twin'|'staging'|'fusion'|'journal';
type User={email:string;role:string};
type TwinResult={
 scenario_name:string;data_mode:string;persisted:boolean;
 baseline:{network_resilience_index:number;open_segments:number;total_segments:number};
 scenario:{network_resilience_index:number;resilience_delta:number;newly_closed_segments:number;high_risk_segments:number;affected_shipments:number;critical_shipments_affected:number;districts_with_impact:number};
 segment_impacts:Array<{segment_id:string;name:string;baseline_risk:number;projected_risk:number;projected_status:string;risk_uplift:number;drivers:Array<{factor:string;risk_uplift:number}>}>;
 affected_shipments:Array<{shipment_code:string;cargo_type:string;priority:string;origin:string;destination:string;impact:string;baseline_eta_minutes:number|null;scenario_eta_minutes:number|null;additional_eta_minutes:number|null}>;
 district_impacts:Array<{district:string;state:string;baseline_accessibility:number;projected_accessibility:number;change:number;status:string}>;
 recovery_plan:Array<{segment_id:string;corridor:string;state:string;required_team:string;illustrative_recovery_window_hours:number;priority:string}>;
 illustrative_recovery_curve:Array<{hours_from_scenario:number;illustrative_resilience_index:number}>;
};
const resourceTypes=['MEDICAL_KITS','FOOD_PACKS','RELIEF_KITS','ROAD_REPAIR_KITS','FUEL_LITERS'];
function RangeField({label,value,min,max,step,onChange,suffix=''}:{label:string;value:number;min:number;max:number;step:number;onChange:(value:number)=>void;suffix?:string}) {
 return <label className="dt-range"><span>{label}<b>{value.toFixed(step<1?2:0)}{suffix}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}

export default function DigitalTwin({user}:{user:User}) {
 const [tab,setTab]=useState<Tab>('twin'),[scenarioName,setScenarioName]=useState('Extreme monsoon compound event'),[hazard,setHazard]=useState('COMPOUND');
 const [rain,setRain]=useState(2.4),[flood,setFlood]=useState(.8),[landslide,setLandslide]=useState(.9),[bridge,setBridge]=useState(.7),[demand,setDemand]=useState(1.6);
 const [twin,setTwin]=useState<TwinResult|null>(null),[twinBusy,setTwinBusy]=useState(false);
 const [resource,setResource]=useState('MEDICAL_KITS'),[staging,setStaging]=useState<any>(null),[fusion,setFusion]=useState<any>(null);
 const [journal,setJournal]=useState<any[]>([]),[integrity,setIntegrity]=useState<any>(null);
 const [decisionType,setDecisionType]=useState('RESOURCE_PREPOSITION'),[entityType,setEntityType]=useState('DISTRICT'),[entityRef,setEntityRef]=useState('Dima Hasao');
 const [summary,setSummary]=useState('Pre-position critical medical kits in high-exposure districts');
 const [rationale,setRationale]=useState('Digital twin indicates elevated corridor exposure. Stage a limited contingency allocation near the affected service area pending field confirmation.');
 const [proposalBusy,setProposalBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');

 async function runTwin(){setTwinBusy(true);setError('');setNotice('');try{const r=await api.post('/advanced/digital-twin/run',{scenario_name:scenarioName,hazard_focus:hazard,rainfall_multiplier:rain,flood_severity:flood,landslide_activity:landslide,bridge_stress:bridge,demand_surge:demand});setTwin(r.data);}catch{setError('Digital twin API unavailable. Start the backend and sign in again.');}finally{setTwinBusy(false);}}
 async function loadStaging(){setError('');setNotice('');try{const r=await api.post('/advanced/resource-staging/plan',{resource_type:resource});setStaging(r.data);}catch{setError('Resource staging API unavailable. Check database and backend logs.');}}
 async function loadFusion(){setError('');setNotice('');try{const r=await api.get('/advanced/incident-fusion/analyze?radius_km=5&window_hours=24');setFusion(r.data);}catch{setError('Incident fusion API unavailable.');}}
 async function loadJournal(){setError('');try{const [events,chain]=await Promise.all([api.get('/advanced/decisions'),api.get('/advanced/decisions/integrity')]);setJournal(events.data.proposals);setIntegrity(chain.data);}catch{setError('Decision journal unavailable.');}}
 useEffect(()=>{if(tab==='staging'&&!staging)void loadStaging();if(tab==='fusion'&&!fusion)void loadFusion();if(tab==='journal')void loadJournal();},[tab]);
 async function createProposal(e:React.FormEvent){e.preventDefault();setProposalBusy(true);setError('');setNotice('');try{
  const r=await api.post('/advanced/decisions/propose',{decision_type:decisionType,entity_type:entityType,entity_ref:entityRef,summary,rationale,
   evidence_snapshot:twin?{scenario_name:twin.scenario_name,network_resilience_index:twin.scenario.network_resilience_index,
   critical_shipments_affected:twin.scenario.critical_shipments_affected,affected_shipment_count:twin.scenario.affected_shipments,data_mode:twin.data_mode}:{source:'operator_submitted'}});
  setNotice(`Proposal #${r.data.proposal_id} recorded · awaiting authorized review.`);await loadJournal();
 }catch{setError('Could not record the proposal. The current role may not have permission.');}finally{setProposalBusy(false);}}
 async function review(id:number,decision:'APPROVED'|'REJECTED'){const notes=window.prompt(`Review note for ${decision.toLowerCase()}:`);if(!notes||notes.trim().length<5)return;
  try{await api.post(`/advanced/decisions/${id}/review`,{decision,notes});setNotice(`Proposal #${id} marked ${decision.toLowerCase()} in the journal.`);await loadJournal();}
  catch(e:any){setError(e?.response?.data?.detail||'Review could not be recorded.');}}
 const tabs:Array<{id:Tab;label:string;icon:any}>=[
  {id:'twin',label:'Disaster digital twin',icon:Network},{id:'staging',label:'Relief pre-positioning',icon:Boxes},
  {id:'fusion',label:'Incident signal fusion',icon:Waves},{id:'journal',label:'Decision journal',icon:GitBranch}];
 const canReview=['ADMIN','GOVERNMENT_OFFICIAL'].includes(user.role);
 return <div className="page-stack digital-twin-page">
  <div className="page-heading"><div><div className="eyebrow">STRATEGIC OPERATIONS / RESILIENCE ENGINEERING</div><h1>Digital Twin &amp; Strategic Response</h1><p>Model cascading disruptions, stage essential resources, corroborate field signals and govern operational recommendations.</p></div><span className="notice simulated compact"><Sparkles size={14}/> ADVANCED SIMULATION LAYER</span></div>
  <div className="dt-banner"><div className="dt-banner-icon"><Network size={23}/></div><div><b>One network. Multiple futures. Traceable decisions.</b><p>Scenario outputs and inventory are synthetic. Simulation does not alter operational records or issue dispatch instructions.</p></div><span className="dt-banner-stamp">HUMAN-APPROVED</span></div>
  {error&&<div className="notice warning">{error}</div>}{notice&&<div className="notice simulated"><CheckCircle2 size={15}/>{notice}</div>}
  <div className="dt-tabs">{tabs.map(item=><button key={item.id} onClick={()=>setTab(item.id)} className={tab===item.id?'active':''}><item.icon size={16}/>{item.label}</button>)}</div>
  {tab==='twin'&&<div className="page-stack">
   <div className="two-column dt-input-grid">
    <section className="panel"><div className="panel-head"><div><div className="eyebrow">SCENARIO DESIGNER</div><h2>Compose a compound disruption</h2></div><ShieldAlert size={19}/></div>
     <label className="field-label">Scenario name<input value={scenarioName} onChange={e=>setScenarioName(e.target.value)}/></label>
     <label className="field-label">Dominant hazard<select value={hazard} onChange={e=>setHazard(e.target.value)}>{['FLOOD','LANDSLIDE','BRIDGE','COMPOUND'].map(x=><option key={x}>{x}</option>)}</select></label>
     <RangeField label="Rainfall intensity multiplier" value={rain} min={.5} max={4} step={.1} onChange={setRain} suffix="×"/>
     <RangeField label="Flood severity" value={flood} min={0} max={1} step={.05} onChange={setFlood}/>
     <RangeField label="Landslide activity" value={landslide} min={0} max={1} step={.05} onChange={setLandslide}/>
     <RangeField label="Bridge stress" value={bridge} min={0} max={1} step={.05} onChange={setBridge}/>
     <RangeField label="Essential-demand surge" value={demand} min={.5} max={3} step={.1} onChange={setDemand} suffix="×"/>
     <button className="button primary full" disabled={twinBusy} onClick={runTwin}><Activity size={16}/>{twinBusy?'Simulating network…':'Run cascading-impact simulation'}</button>
    </section>
    <section className="panel"><div className="panel-head"><div><div className="eyebrow">SCENARIO OUTPUTS</div><h2>Network consequence summary</h2></div><RadioTower size={19}/></div>
     {!twin?<div className="dt-empty"><Network size={35}/><b>Run a scenario to build the digital twin</b><span>Projected isolation, shipment disruption, district access loss and recovery priorities will appear here.</span></div>:<>
      <div className="dt-stat-grid"><div><small>Baseline resilience</small><b>{twin.baseline.network_resilience_index}/100</b></div><div><small>Scenario resilience</small><b className="dt-danger">{twin.scenario.network_resilience_index}/100</b></div><div><small>New closures</small><b>{twin.scenario.newly_closed_segments}</b></div><div><small>Critical cargo exposed</small><b className="dt-danger">{twin.scenario.critical_shipments_affected}</b></div></div>
      <div className="dt-compare"><span>Network resilience change</span><b className={twin.scenario.resilience_delta<0?'dt-danger':'dt-good'}>{twin.scenario.resilience_delta>0?'+':''}{twin.scenario.resilience_delta} points</b></div>
      <div className="dt-meter"><span style={{width:`${twin.scenario.network_resilience_index}%`}}/></div>
      <div className="dt-summary-note">{twin.scenario.affected_shipments} shipments require review · {twin.scenario.districts_with_impact} districts show accessibility impact · {twin.scenario.high_risk_segments} open high-risk segments.</div>
     </>}
    </section>
   </div>
   {twin&&<>
    <section className="panel"><div className="panel-head"><div><div className="eyebrow">CASCADE PROPAGATION</div><h2>Corridor impact register</h2></div><span className="panel-count">{twin.segment_impacts.length} segments</span></div>
     <div className="table-wrap"><table><thead><tr><th>Corridor</th><th>Baseline → projected</th><th>Projected state</th><th>Risk uplift</th><th>Contributing factors</th></tr></thead><tbody>{twin.segment_impacts.slice(0,12).map(row=><tr key={row.segment_id}><td><b>{row.name}</b></td><td>{row.baseline_risk} → <b className={row.projected_risk>=65?'risk-high':''}>{row.projected_risk}</b></td><td><span className={`status-pill ${row.projected_status==='CLOSED'?'danger':'neutral'}`}>{row.projected_status}</span></td><td>+{row.risk_uplift}</td><td className="dt-driver">{row.drivers.map(x=>x.factor).join(' · ')||'No material driver'}</td></tr>)}</tbody></table></div>
    </section>
    <div className="two-column"><section className="panel"><div className="panel-head"><div><div className="eyebrow">ESSENTIAL CARGO</div><h2>Shipment cascade impacts</h2></div><PackageSearch size={18}/></div>
     {twin.affected_shipments.length?twin.affected_shipments.map(s=><div className="dt-list-row" key={s.shipment_code}><div><b>{s.shipment_code}</b><small>{s.priority} · {s.cargo_type} · {s.origin} → {s.destination}</small></div><div className="dt-list-right"><b>{s.impact.replaceAll('_',' ')}</b><small>{s.additional_eta_minutes===null?'No scenario path':`+${s.additional_eta_minutes} min`}</small></div></div>):<div className="dt-empty">No shipment impact in this scenario.</div>}
    </section><section className="panel"><div className="panel-head"><div><div className="eyebrow">DISTRICT ACCESS</div><h2>District isolation signals</h2></div><MapPinned size={18}/></div>
     {twin.district_impacts.length?twin.district_impacts.map(d=><div className="dt-list-row" key={d.district}><div><b>{d.district}</b><small>{d.state} · {d.status.replaceAll('_',' ')}</small></div><div className="dt-list-right"><b>{d.baseline_accessibility} → {d.projected_accessibility}</b><small className="dt-danger">{d.change} points</small></div></div>):<div className="dt-empty">No district accessibility loss in this scenario.</div>}
    </section></div>
    <div className="two-column"><section className="panel"><div className="panel-head"><div><div className="eyebrow">RESTORATION STRATEGY</div><h2>Recovery work queue</h2></div><Clock3 size={18}/></div>
     {twin.recovery_plan.length?twin.recovery_plan.slice(0,7).map(row=><div className="dt-list-row" key={row.segment_id}><div><b>{row.corridor}</b><small>{row.required_team}</small></div><div className="dt-list-right"><b>{row.illustrative_recovery_window_hours} h</b><small>{row.priority}</small></div></div>):<div className="dt-empty">No recovery work generated.</div>}
    </section><section className="panel"><div className="panel-head"><div><div className="eyebrow">RESILIENCE TRAJECTORY</div><h2>Illustrative recovery curve</h2></div><Activity size={18}/></div>
     <div className="dt-recovery-bars">{twin.illustrative_recovery_curve.map(p=><div key={p.hours_from_scenario}><div className="dt-bar-column"><span style={{height:`${p.illustrative_resilience_index}%`}}/></div><b>{p.illustrative_resilience_index}</b><small>{p.hours_from_scenario}h</small></div>)}</div>
     <p className="safety-note">Illustrative recovery trajectory generated from a simple decay heuristic. It is not an engineering restoration forecast.</p>
    </section></div>
    <button className="button secondary" onClick={()=>{setDecisionType('ROAD_STATUS_CHANGE');setEntityType('SCENARIO');setEntityRef(twin.scenario_name);setSummary(`Review scenario ${twin.scenario_name}`);setRationale('Review projected corridor and shipment impacts. Validate with field officers before any operational action.');setTab('journal');}}>Record a decision based on this scenario <ArrowRight size={14}/></button>
   </>}
  </div>}
  {tab==='staging'&&<div className="page-stack"><section className="panel"><div className="panel-head"><div><div className="eyebrow">NETWORK-WIDE INVENTORY OPTIMIZATION</div><h2>Strategic relief resource staging</h2><p>Recommend which hubs should cover high-need districts under the current synthetic road graph.</p></div><Boxes size={20}/></div>
   <div className="dt-form-row"><label className="field-label">Resource category<select value={resource} onChange={e=>{setResource(e.target.value);setStaging(null);}}>{resourceTypes.map(x=><option key={x}>{x}</option>)}</select></label><button className="button primary" onClick={loadStaging}>Optimize staging plan</button></div>
   {staging&&<><div className="dt-stat-grid four"><div><small>Districts covered</small><b>{staging.summary.districts_considered}</b></div><div><small>Requested</small><b>{staging.summary.total_requested_units} {staging.unit}</b></div><div><small>Proposed allocation</small><b className="dt-good">{staging.summary.proposed_allocation_units}</b></div><div><small>Unfilled demand</small><b className="dt-danger">{staging.summary.unfilled_units}</b></div></div>
    <div className="table-wrap"><table><thead><tr><th>Priority district</th><th>Demand index</th><th>Requested</th><th>Proposed</th><th>Shortfall</th><th>Recommended supply hubs</th></tr></thead><tbody>{staging.district_priorities.map((d:any)=><tr key={d.district}><td><b>{d.district}</b><small>{d.state}</small></td><td>{d.demand_index}/100</td><td>{d.requested_units}</td><td>{d.proposed_units}</td><td className={d.shortfall_units?'risk-high':''}>{d.shortfall_units}</td><td>{d.source_facilities.join(', ')||'No reachable stocked hub'}</td></tr>)}</tbody></table></div>
    <section className="dt-subpanel"><h3>Supply transfer legs</h3><div className="table-wrap"><table><thead><tr><th>Hub</th><th>Destination</th><th>Proposed</th><th>Route ETA</th><th>Distance</th><th>Route risk</th></tr></thead><tbody>{staging.allocation_legs.filter((x:any)=>x.facility).map((x:any,i:number)=><tr key={i}><td>{x.facility}</td><td>{x.district}</td><td>{x.proposed_units} {x.unit}</td><td>{x.travel_eta_minutes} min</td><td>{x.distance_km} km</td><td>{x.route_risk_score}/100</td></tr>)}</tbody></table></div></section>
    <section className="dt-subpanel"><h3>Restock watch</h3>{staging.restock_actions.length?staging.restock_actions.map((x:any)=><div className="dt-list-row" key={x.facility_code}><div><b>{x.facility}</b><small>{x.resource_type} · current {x.current_quantity} / reorder {x.reorder_level}</small></div><div className="dt-list-right"><b>+{x.suggested_restock_units}</b><small>{x.unit} proposed restock</small></div></div>):<div className="dt-empty">No inventory items are below reorder threshold.</div>}</section>
   </>}
  </section><div className="notice info"><Boxes size={16}/> Allocation is a planning proposal only. Quantities remain unchanged until an authorized inventory workflow is implemented.</div></div>}
  {tab==='fusion'&&<div className="page-stack"><section className="panel"><div className="panel-head"><div><div className="eyebrow">FIELD REPORT QUALITY</div><h2>Spatial-temporal signal fusion</h2><p>Find reports that may describe the same event and rank them for manual verification.</p></div><Waves size={20}/></div>
   <div className="dt-stat-grid three"><div><small>Reports analyzed</small><b>{fusion?.summary.reports_analyzed??'—'}</b></div><div><small>Candidate clusters</small><b>{fusion?.summary.duplicate_clusters??'—'}</b></div><div><small>Reports in clusters</small><b>{fusion?.summary.candidate_duplicate_reports??'—'}</b></div></div>
   <button className="button secondary" onClick={loadFusion}>Refresh corroboration analysis</button>
   {fusion?.duplicate_clusters?.length?fusion.duplicate_clusters.map((cluster:any)=><div className="dt-cluster" key={cluster.cluster_id}><div className="dt-cluster-head"><div><b>{cluster.cluster_id}</b><small>{cluster.incident_type} · {cluster.districts.join(', ')}</small></div><span className="status-pill pending">{cluster.reports.length} related reports</span></div><div className="dt-cluster-reports">{cluster.reports.map((code:string)=><span key={code}>{code}</span>)}</div><p>{cluster.independent_reporters} independent reporting sources · human review required.</p></div>):fusion?<div className="dt-empty">No candidate duplicate clusters were detected in the current report set.</div>:null}
   <div className="table-wrap"><table><thead><tr><th>Report</th><th>Cluster</th><th>Confidence</th><th>Sources</th><th>Signal status</th><th>Recommendation</th></tr></thead><tbody>{fusion?.report_scores?.map((item:any)=><tr key={item.report_code}><td><b>{item.report_code}</b></td><td>{item.cluster_id}</td><td>{item.confidence_score}/100</td><td>{item.independent_reporters}</td><td>{item.confidence_band}</td><td className="dt-driver">{item.recommended_action}</td></tr>)}</tbody></table></div>
  </section><div className="notice warning"><ShieldAlert size={16}/> Similar location and time do not prove a duplicate or verify an event. Never auto-merge, suppress or reject reports based on this score.</div></div>}
  {tab==='journal'&&<div className="page-stack"><div className="two-column dt-journal-grid">
   <section className="panel"><div className="panel-head"><div><div className="eyebrow">DECISION GOVERNANCE</div><h2>Record an operational proposal</h2><p>Every proposal awaits a different authorized reviewer.</p></div><GitBranch size={20}/></div>
    <form className="dt-proposal-form" onSubmit={createProposal}>
     <label className="field-label">Proposal type<select value={decisionType} onChange={e=>setDecisionType(e.target.value)}>{['ROUTE_CHANGE','RESOURCE_PREPOSITION','INCIDENT_ESCALATION','PUBLIC_ADVISORY','ROAD_STATUS_CHANGE'].map(x=><option key={x}>{x}</option>)}</select></label>
     <div className="dt-form-row"><label className="field-label">Entity type<input value={entityType} onChange={e=>setEntityType(e.target.value)}/></label><label className="field-label">Entity reference<input value={entityRef} onChange={e=>setEntityRef(e.target.value)}/></label></div>
     <label className="field-label">Summary<input value={summary} onChange={e=>setSummary(e.target.value)} minLength={5}/></label>
     <label className="field-label">Rationale<textarea rows={4} value={rationale} onChange={e=>setRationale(e.target.value)} minLength={10}/></label>
     <button className="button primary full" disabled={proposalBusy}>{proposalBusy?'Recording…':'Submit for independent approval'}</button>
    </form>
   </section>
   <section className="panel"><div className="panel-head"><div><div className="eyebrow">AUDIT INTEGRITY</div><h2>Hash-chain verification</h2></div><GitBranch size={20}/></div>
    <div className={`dt-integrity ${integrity?.integrity==='VALID'?'valid':'invalid'}`}><div>{integrity?.integrity==='VALID'?<BadgeCheck size={22}/>:<ShieldAlert size={22}/>}</div><b>{integrity?.integrity||'NOT CHECKED'}</b><small>{integrity?.events_checked??0} journal events checked</small></div>
    <button className="button secondary full" onClick={loadJournal}>Verify the complete journal</button>
    <p className="safety-note">SHA-256 chaining makes changes detectable when the chain is checked. Use independent backups, database permissions and signed identities for a production audit regime.</p>
   </section>
  </div>
  <section className="panel"><div className="panel-head"><div><div className="eyebrow">APPEND-ONLY EVENT HISTORY</div><h2>Proposal and review timeline</h2></div><span className="panel-count">{journal.length} proposals</span></div>
   {journal.length?journal.map((item:any)=><div className="dt-journal-row" key={item.proposal_id}><div className="dt-journal-marker"><GitBranch size={15}/></div><div className="dt-journal-body">
    <div className="dt-journal-title"><b>#{item.proposal_id} · {item.summary}</b><span className={`status-pill ${item.status==='APPROVED'?'verified':item.status==='REJECTED'?'danger':'pending'}`}>{item.status}</span></div>
    <small>{item.decision_type} · {item.entity_type} / {item.entity_ref} · proposed by {item.proposed_by}</small><p>{item.rationale}</p>
    {item.reviewed_by&&<div className="dt-review-note">Reviewed by {item.reviewed_by}: {item.review_notes}</div>}
    {item.status==='PENDING_APPROVAL'&&canReview&&item.proposed_by!==user.email&&<div className="dt-review-actions"><button onClick={()=>review(item.proposal_id,'APPROVED')}>Approve proposal</button><button onClick={()=>review(item.proposal_id,'REJECTED')}>Reject proposal</button></div>}
   </div></div>):<div className="dt-empty">No decisions recorded. Submit a proposal to start the append-only journal.</div>}
  </section>
  <div className="notice info"><ShieldCheck size={16}/> Approval is a governance record only. It does not execute a route change, move inventory, publish an advisory or dispatch a vehicle.</div></div>}
 </div>;
}
