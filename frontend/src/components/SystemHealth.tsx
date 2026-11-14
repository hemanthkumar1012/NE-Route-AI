import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Database, HeartPulse, RefreshCw, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { api } from '../services/api';

type Readiness = {
  overall_status: string;
  api: string;
  database: string;
  postgis: string;
  ml_service: string;
  ml_model_loaded?: boolean;
  ml_model_version?: string;
  data_mode: string;
  demo_mode: boolean;
  jwt_secret_configuration: string;
  weather_provider: string;
  sms_provider: string;
  email_provider: string;
  whatsapp_provider: string;
  vision_model: string;
  dispatch_authority: string;
};

const stateTone = (value?: string) => {
  const normalized = (value || 'UNKNOWN').toUpperCase();
  if (['READY', 'CONNECTED', 'AVAILABLE'].some(token => normalized.includes(token))) return 'healthy';
  if (['DEGRADED', 'FALLBACK', 'SIMULATION', 'HUMAN_REVIEW', 'HUMAN_APPROVAL', 'NOT_INSTALLED', 'DEFAULT', 'DEMO'].some(token => normalized.includes(token))) return 'warning';
  return 'offline';
};

function StatusLine({ label, value, detail }: { label: string; value?: string; detail?: string }) {
  const tone = stateTone(value);
  return <div className="health-line">
    <span className={`health-dot ${tone}`}/>
    <div className="health-copy"><b>{label}</b>{detail && <small>{detail}</small>}</div>
    <strong className={`health-value ${tone}`}>{value || 'UNKNOWN'}</strong>
  </div>;
}

export default function SystemHealth() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/system/readiness');
      setData(response.data);
    } catch {
      setError('The API could not return its readiness report. Check the backend and database containers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const rows = data ? [
    { label: 'FastAPI application', value: data.api, detail: 'Authenticated REST API and application process' },
    { label: 'PostgreSQL database', value: data.database, detail: 'Live SELECT 1 connectivity probe' },
    { label: 'PostGIS extension', value: data.postgis, detail: 'Optional for the current JSON-coordinate prototype' },
    { label: 'ML inference service', value: data.ml_service, detail: data.ml_model_version ? `Model version: ${data.ml_model_version}` : 'Rule-based fallback remains available' },
    { label: 'Weather integration', value: data.weather_provider, detail: 'External weather feed is not connected' },
    { label: 'SMS integration', value: data.sms_provider, detail: 'No outbound SMS configured' },
    { label: 'Email integration', value: data.email_provider, detail: 'No email transport configured' },
    { label: 'WhatsApp integration', value: data.whatsapp_provider, detail: 'No WhatsApp provider configured' },
    { label: 'Incident vision model', value: data.vision_model, detail: 'Images remain subject to human verification' },
    { label: 'Dispatch authority', value: data.dispatch_authority, detail: 'No autonomous vehicle dispatch' },
  ] : [];

  return <div className="page-stack system-health-page">
    <div className="page-heading">
      <div><div className="eyebrow">PLATFORM OPERATIONS / DIAGNOSTICS</div><h1>System Health &amp; Diagnostics</h1>
        <p>Live dependency probes, model availability and deployment safety configuration.</p></div>
      <button className="button secondary" onClick={refresh} disabled={loading}><RefreshCw size={15}/>{loading ? 'Checking…' : 'Refresh diagnostics'}</button>
    </div>
    {error && <div className="notice warning"><AlertTriangle size={16}/>{error}</div>}
    {data && <>
      <div className="health-hero">
        <div className={`health-orb ${data.overall_status === 'READY' ? 'healthy' : 'warning'}`}><HeartPulse size={26}/></div>
        <div className="health-hero-copy"><span className="eyebrow">BACKEND READINESS</span><h2>{data.overall_status === 'READY' ? 'Core services ready' : 'Service degradation detected'}</h2>
          <p>{data.overall_status === 'READY' ? 'The API can reach its database. Optional services are reported separately.' : 'One or more core dependencies are unavailable. Check the service register below.'}</p></div>
        <span className={`health-mode ${data.demo_mode ? 'warning' : 'healthy'}`}>{data.data_mode}</span>
      </div>
      <div className="health-summary-grid">
        <div className="panel health-summary"><Database size={19}/><small>DATABASE</small><b>{data.database}</b><span>PostGIS: {data.postgis}</span></div>
        <div className="panel health-summary"><Workflow size={19}/><small>ML SERVICE</small><b>{data.ml_service}</b><span>{data.ml_model_loaded ? 'Model loaded' : 'Fallback may be active'}</span></div>
        <div className="panel health-summary"><ShieldCheck size={19}/><small>AUTH CONFIGURATION</small><b>{data.jwt_secret_configuration}</b><span>{data.demo_mode ? 'Demo accounts may be seeded' : 'Demo seeding disabled'}</span></div>
      </div>
      <section className="panel">
        <div className="panel-head"><div><div className="eyebrow">DEPENDENCY REGISTER</div><h2>Service-by-service status</h2></div><Activity size={19}/></div>
        {rows.map(row => <StatusLine key={row.label} {...row}/>)}
      </section>
      <div className="notice info"><Sparkles size={16}/> Demo-mode road, rainfall, GPS and depot data are synthetic. “Ready” means a service responded successfully; it does not mean an external government or weather feed is connected.</div>
      <section className="panel">
        <div className="panel-head"><div><div className="eyebrow">PRODUCTION CHECKLIST</div><h2>Before a real deployment</h2></div><Clock3 size={19}/></div>
        <div className="health-checklist">
          <div><CheckCircle2 size={15}/> Frontend and API share one origin in the Docker Compose stack</div>
          <div><CheckCircle2 size={15}/> Database connection is probed instead of assumed</div>
          <div><CheckCircle2 size={15}/> Demo seeding can be disabled with DEMO_MODE=false</div>
          <div><AlertTriangle size={15}/> Configure an independent high-entropy JWT_SECRET</div>
          <div><AlertTriangle size={15}/> Connect validated road, weather and incident data sources</div>
        </div>
      </section>
    </>}
  </div>;
}
