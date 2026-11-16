import { useState, type FormEvent } from 'react';
import { ArrowRight, Bot, CheckCircle2, CircleHelp, Clock3, Database, Lightbulb, LoaderCircle, MessageSquareText, Plane, Route, ShieldCheck, Sparkles, Truck, Waves } from 'lucide-react';

type Answer={answer:string;data_mode?:string;sources?:string[]};
type Props={question:string;answer:Answer|null;loading:boolean;onQuestionChange:(value:string)=>void;onAsk:()=>void};
const prompts=[
  {label:'Delayed medicine cargo',question:'Which medicine shipments are delayed?',icon:Truck},
  {label:'Closed corridors',question:'Which corridors are blocked or closed?',icon:Route},
  {label:'Critical route comparison',question:'What is the fastest route for critical medical kits from Guwahati to Imphal?',icon:Plane},
  {label:'Incident situation',question:'Summarize the latest field incidents and their severity.',icon:Waves},
];
const sourceLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function CopilotWorkspace({question,answer,loading,onQuestionChange,onAsk}:Props){
 const [showGuide,setShowGuide]=useState(false);
 function submit(event:FormEvent){event.preventDefault();if(question.trim().length>=3&&!loading)onAsk();}
 return <div className="page-stack copilot-workspace">
  <section className="copilot-hero">
    <div className="copilot-hero-icon"><Bot size={24}/><i/></div>
    <div className="copilot-hero-copy"><div className="copilot-hero-label"><Sparkles size={13}/> NE-ROUTE INTELLIGENCE ASSISTANT</div><h1>Operations copilot</h1><p>Ask questions about your current route plan, simulated network, incidents, cargo and accessibility indicators.</p></div>
    <span className="copilot-mode-tag"><Database size={12}/> Grounded answers</span>
  </section>
  <div className="copilot-workspace-grid">
    <section className="panel copilot-compose">
      <div className="copilot-panel-heading"><div><span className="eyebrow">ASK THE NETWORK</span><h2>What do you need to know?</h2></div><span className="copilot-secure-tag"><ShieldCheck size={13}/> Context-bound</span></div>
      <div className="copilot-prompt-grid">
        {prompts.map(prompt=>{const Icon=prompt.icon;return <button type="button" key={prompt.label} onClick={()=>onQuestionChange(prompt.question)}><Icon size={15}/><span>{prompt.label}</span><ArrowRight size={12}/></button>;})}
      </div>
      <form className="copilot-form" onSubmit={submit}>
        <label htmlFor="copilot-question">Your question</label>
        <textarea id="copilot-question" value={question} onChange={event=>onQuestionChange(event.target.value)} placeholder="Ask about route alternatives, delays, risks or field reports…" rows={5} maxLength={2000}/>
        <div className="copilot-compose-footer"><span>{question.length}/2000 characters · Use named network locations for route questions</span><button className="button primary" type="submit" disabled={loading||question.trim().length<3}>{loading?<><LoaderCircle size={15} className="copilot-spin"/> Analysing…</>:<>Ask NE-Route AI <ArrowRight size={15}/></>}</button></div>
      </form>
      <div className="copilot-source-note"><ShieldCheck size={14}/><span>Answers are grounded in the platform snapshot. They do not issue dispatch commands or replace field verification.</span></div>
    </section>
    <section className="panel copilot-response">
      <div className="copilot-response-head"><div><span className="eyebrow">RESPONSE WORKSPACE</span><h2>Assistant analysis</h2></div><span className={'copilot-live-dot '+(loading?'working':answer?'ready':'')}>{loading?'WORKING':answer?'RESPONSE READY':'STANDBY'}</span></div>
      {loading?<div className="copilot-loading-state" aria-live="polite"><span className="copilot-spin-large"><LoaderCircle size={25}/></span><b>Checking the operational snapshot</b><small>Retrieving relevant records and evaluating the question…</small><div className="copilot-skeleton"/><div className="copilot-skeleton short"/></div>
      :answer?<div className="copilot-answer-detail">
        <div className="copilot-answer-meta"><span><CheckCircle2 size={13}/> Answer generated</span><span>{sourceLabel(answer.data_mode||'SIMULATED')}</span></div>
        <p>{answer.answer}</p>
        <div className="copilot-answer-sources"><small>SOURCES USED</small><div>{(answer.sources?.length?answer.sources:['Platform database snapshot']).map(source=><span key={source}><Database size={11}/>{sourceLabel(source)}</span>)}</div></div>
        <div className="copilot-answer-caution"><Lightbulb size={14}/> Confirm high-impact decisions with the authorized operations team.</div>
      </div>:<div className="copilot-empty-state">
        <div className="copilot-empty-icon"><MessageSquareText size={24}/></div><b>Waiting for your question</b><p>Select a prompt or enter a question. The response will appear here with its source context.</p>
        <button type="button" className="copilot-guide-button" onClick={()=>setShowGuide(value=>!value)}><CircleHelp size={13}/>{showGuide?'Hide question guide':'What can I ask?'}</button>
        {showGuide&&<div className="copilot-guide"><span>NETWORK STATUS</span><span>ROUTE ALTERNATIVES</span><span>SHIPMENT DELAYS</span><span>INCIDENT SEVERITY</span><span>DISTRICT ACCESSIBILITY</span></div>}
      </div>}
    </section>
  </div>
  <div className="copilot-grounding-footer"><span><Clock3 size={13}/> Uses the current API snapshot when the question is submitted.</span><span><ShieldCheck size={13}/> No autonomous actions</span></div>
 </div>;
}
