import { Activity, ArrowUpRight, Bot, CheckCircle2, Clock3, ClipboardList, Map, Package, Radar, Route, ShieldAlert, Truck, Zap } from 'lucide-react';

type Page = 'overview'|'briefing'|'map'|'routes'|'shipments'|'vehicles'|'incidents'|'alerts'|'copilot'|'risk'|'missions'|'digital-twin'|'system';
type Props = {
  summary: any;
  incidents: any[];
  alerts: any[];
  shipments: any[];
  vehicles: any[];
  apiStatus: 'CHECKING'|'CONNECTED'|'OFFLINE';
  lastUpdated: Date | null;
  onNavigate: (page: Page) => void;
};

const text = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value : fallback;
const isClosed = (value: unknown) => ['RESOLVED','CLOSED','COMPLETED'].includes(String(value || '').toUpperCase());

export default function OverviewCommandDeck({ summary, incidents, alerts, shipments, vehicles, apiStatus, lastUpdated, onNavigate }: Props) {
  const openIncidents = incidents.filter(item => !isClosed(item.status));
  const openAlerts = alerts.filter(item => String(item.status || '').toUpperCase() === 'OPEN');
  const delayedShipments = shipments.filter(item => /DELAY|LATE|AT.?RISK/i.test(String(item.status || '')));
  const attention = [
    ...openIncidents.slice(0, 3).map((item, index) => ({
      key: String(item.id || item.report_code || `incident-${index}`),
      kind: 'INCIDENT',
      title: text(item.incident_type, 'Field incident'),
      meta: [item.report_code, item.district].filter(Boolean).join(' · ') || 'Incident record',
      level: text(item.severity, 'REVIEW'),
      page: 'incidents' as Page,
      icon: ShieldAlert,
    })),
    ...openAlerts.slice(0, 2).map((item, index) => ({
      key: String(item.id || item.alert_code || `alert-${index}`),
      kind: 'ALERT',
      title: text(item.title || item.alert_type || item.message, 'Operational alert'),
      meta: text(item.alert_code, 'Alert awaiting review'),
      level: text(item.severity, 'OPEN'),
      page: 'alerts' as Page,
      icon: Radar,
    })),
    ...delayedShipments.slice(0, 2).map((item, index) => ({
      key: String(item.id || item.shipment_code || `shipment-${index}`),
      kind: 'SHIPMENT',
      title: text(item.shipment_code, 'Priority shipment'),
      meta: [item.cargo_type, item.destination].filter(Boolean).join(' · ') || 'Shipment status requires review',
      level: text(item.status, 'DELAYED'),
      page: 'shipments' as Page,
      icon: Package,
    })),
  ].slice(0, 5);

  const actions = [
    { label: 'Inspect the network', detail: 'Open spatial command terrain', icon: Map, tag: 'SPATIAL', page: 'map' as Page },
    { label: 'Plan a safer corridor', detail: 'Compare route objectives', icon: Route, tag: 'DECISION SUPPORT', page: 'routes' as Page },
    { label: 'Coordinate response', detail: 'Review missions and assignments', icon: ClipboardList, tag: 'FIELD OPS', page: 'missions' as Page },
    { label: 'Ask the AI copilot', detail: 'Query the operational snapshot', icon: Bot, tag: 'ASSISTED', page: 'copilot' as Page },
  ];

  const connectionLabel = apiStatus === 'CONNECTED' ? 'API CONNECTED' : apiStatus === 'OFFLINE' ? 'API OFFLINE' : 'SYNC IN PROGRESS';
  const dataMode = text(summary?.data_mode, 'DATA MODE UNKNOWN');

  return (
    <section className="command-deck" aria-label="Operations command deck">
      <div className="command-deck-head">
        <div>
          <span className="eyebrow">LIVE OPERATIONS / COMMAND LAYER</span>
          <h2>Decision desk</h2>
          <p>Move from regional signals to the next operational action.</p>
        </div>
        <div className="command-deck-state">
          <span className={`command-state-dot ${apiStatus.toLowerCase()}`}/>
          <span><b>{connectionLabel}</b><small>{dataMode}</small></span>
        </div>
      </div>

      <div className="command-deck-grid">
        <section className="command-focus-card">
          <div className="command-card-head">
            <div><span className="command-card-kicker"><Activity size={13}/> PRIORITY QUEUE</span><h3>Signals requiring attention</h3></div>
            <span className="command-count">{attention.length.toString().padStart(2, '0')}</span>
          </div>
          {attention.length ? <div className="command-attention-list">
            {attention.map(item => <button className="command-attention-row" key={item.key} onClick={() => onNavigate(item.page)}>
              <span className="command-attention-icon"><item.icon size={15}/></span>
              <span className="command-attention-copy"><b>{item.title}</b><small>{item.kind} · {item.meta}</small></span>
              <span className="command-attention-level">{item.level}</span>
              <ArrowUpRight size={14} className="command-attention-arrow"/>
            </button>)}
          </div> : <div className="command-queue-empty"><CheckCircle2 size={19}/><span><b>No open signals in this snapshot</b><small>New items will appear here after the next platform sync.</small></span></div>}
          <button className="command-view-queue" onClick={() => onNavigate(openAlerts.length ? 'alerts' : 'incidents')}>Open field intelligence <ArrowUpRight size={14}/></button>
        </section>

        <section className="command-launch-card">
          <div className="command-card-head">
            <div><span className="command-card-kicker"><Zap size={13}/> RAPID LAUNCH</span><h3>Start an operation</h3></div>
            <span className="command-launch-orb"><Radar size={18}/></span>
          </div>
          <div className="command-action-grid">
            {actions.map(action => <button className="command-action-tile" key={action.page} onClick={() => onNavigate(action.page)}>
              <span className="command-action-icon"><action.icon size={17}/></span>
              <span className="command-action-copy"><small>{action.tag}</small><b>{action.label}</b><em>{action.detail}</em></span>
              <ArrowUpRight size={14} className="command-action-arrow"/>
            </button>)}
          </div>
        </section>
      </div>

      <div className="command-signal-strip">
        <div className="command-signal-intro"><span className="command-card-kicker"><Radar size={12}/> SNAPSHOT TELEMETRY</span><small>Current platform records</small></div>
        <div className="command-signal-metric"><span><Truck size={14}/> Fleet records</span><b>{vehicles.length.toString().padStart(2, '0')}</b></div>
        <div className="command-signal-metric"><span><Package size={14}/> Shipment records</span><b>{shipments.length.toString().padStart(2, '0')}</b></div>
        <div className="command-signal-metric"><span><ShieldAlert size={14}/> Open incidents</span><b>{openIncidents.length.toString().padStart(2, '0')}</b></div>
        <div className="command-signal-metric"><span><Activity size={14}/> Open alerts</span><b>{openAlerts.length.toString().padStart(2, '0')}</b></div>
        <div className="command-signal-sync"><Clock3 size={13}/>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Awaiting sync'}</div>
      </div>
      <div className="command-deck-foot"><span><span className="command-foot-dot"/> DATA-AWARE VIEW</span><span>Metrics reflect the current API response; simulated sources remain labelled in the dashboard.</span></div>
    </section>
  );
}
