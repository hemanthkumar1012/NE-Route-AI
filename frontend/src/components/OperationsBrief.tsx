import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, CheckCircle2, Clock3,
  Download, FileText, Package, Printer, ShieldAlert, Truck
} from 'lucide-react';
import type { DashboardSummary } from '../types';

type Props = {
  summary: DashboardSummary;
  shipments: any[];
  vehicles: any[];
  incidents: any[];
  alerts: any[];
  refreshedAt: Date | null;
  onNavigate: (page: 'shipments' | 'vehicles' | 'incidents' | 'alerts' | 'risk' | 'missions') => void;
};

type Focus = 'ALL' | 'CRITICAL' | 'DELAYED';

const normalize = (value: unknown) => String(value ?? '').trim().toUpperCase();
const safe = (value: unknown) => String(value ?? '').replace(/[\r\n,]/g, ' ');

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function BarRow({ label, value, total, tone = 'coral' }: { label: string; value: number; total: number; tone?: string }) {
  const width = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return <div className="brief-bar-row">
    <div className="brief-bar-label"><span>{label}</span><b>{value}</b></div>
    <div className="brief-bar-track"><span className={tone} style={{ width: `${width}%` }}/></div>
  </div>;
}

export default function OperationsBrief({ summary, shipments, vehicles, incidents, alerts, refreshedAt, onNavigate }: Props) {
  const [focus, setFocus] = useState<Focus>('ALL');
  const [expanded, setExpanded] = useState(false);

  const metrics = useMemo(() => {
    const openAlerts = alerts.filter(item => normalize(item.status) === 'OPEN');
    const pendingIncidents = incidents.filter(item => ['PENDING', 'REPORTED', 'UNDER_REVIEW'].includes(normalize(item.status)));
    const delayedShipments = shipments.filter(item => ['DELAYED', 'LATE', 'AT_RISK'].includes(normalize(item.status)));
    const criticalShipments = shipments.filter(item => normalize(item.priority) === 'CRITICAL');
    const highPriorityShipments = shipments.filter(item => ['CRITICAL', 'HIGH'].includes(normalize(item.priority)));
    const inTransitVehicles = vehicles.filter(item => ['IN_TRANSIT', 'MOVING'].includes(normalize(item.status)));
    const severity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(key => ({
      label: key,
      value: incidents.filter(item => normalize(item.severity) === key).length,
    }));
    const priorities = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'].map(key => ({
      label: key,
      value: shipments.filter(item => normalize(item.priority) === key).length,
    }));
    const accessibility = summary.districts || [];
    const averageAccessibility = accessibility.length
      ? Math.round(accessibility.reduce((sum, item) => sum + Number(item.accessibility_score || 0), 0) / accessibility.length)
      : 0;
    return {
      openAlerts, pendingIncidents, delayedShipments, criticalShipments,
      highPriorityShipments, inTransitVehicles, severity, priorities,
      averageAccessibility,
    };
  }, [summary, shipments, vehicles, incidents, alerts]);

  const attention = useMemo(() => {
    const items = [];
    if (metrics.openAlerts.length) items.push({
      title: 'Triage open alerts',
      detail: `${metrics.openAlerts.length} alert(s) remain open in the current data snapshot.`,
      count: metrics.openAlerts.length, tone: 'red', action: 'alerts' as const,
    });
    if (metrics.pendingIncidents.length) items.push({
      title: 'Verify field reports',
      detail: `${metrics.pendingIncidents.length} incident report(s) are awaiting a review decision.`,
      count: metrics.pendingIncidents.length, tone: 'amber', action: 'incidents' as const,
    });
    if (metrics.delayedShipments.length || Number(summary.kpis.delayed_shipments || 0)) items.push({
      title: 'Review delayed cargo',
      detail: `${Math.max(metrics.delayedShipments.length, Number(summary.kpis.delayed_shipments || 0))} shipment(s) are flagged as delayed by the current snapshot.`,
      count: Math.max(metrics.delayedShipments.length, Number(summary.kpis.delayed_shipments || 0)), tone: 'orange', action: 'shipments' as const,
    });
    if (metrics.criticalShipments.length) items.push({
      title: 'Confirm critical-cargo handoff',
      detail: `${metrics.criticalShipments.length} critical-priority shipment(s) should be checked with the receiving team.`,
      count: metrics.criticalShipments.length, tone: 'blue', action: 'shipments' as const,
    });
    if (!items.length) items.push({
      title: 'No immediate queue flags',
      detail: 'No open alerts, pending incident reports or critical shipments were found in the current snapshot.',
      count: 0, tone: 'green', action: 'risk' as const,
    });
    return items;
  }, [metrics, summary.kpis.delayed_shipments]);

  const filteredShipments = useMemo(() => shipments.filter(item => {
    const status = normalize(item.status);
    const priority = normalize(item.priority);
    if (focus === 'CRITICAL') return priority === 'CRITICAL';
    if (focus === 'DELAYED') return ['DELAYED', 'LATE', 'AT_RISK'].includes(status);
    return true;
  }).sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    return (order[normalize(a.priority)] ?? 4) - (order[normalize(b.priority)] ?? 4);
  }), [shipments, focus]);

  const report = useMemo(() => ({
    title: 'NE-Route AI — Regional Operations Brief',
    generated_at: new Date().toISOString(),
    data_mode: summary.data_mode || 'UNKNOWN',
    note: 'Snapshot generated from the platform API. Confirm all operational facts with authorized field personnel.',
    kpis: summary.kpis,
    district_accessibility: summary.districts,
    shipments,
    vehicles,
    incidents,
    alerts,
    recommended_attention: attention.map(({ title, detail, count }) => ({ title, detail, count })),
  }), [summary, shipments, vehicles, incidents, alerts, attention]);

  function exportJson() {
    downloadFile('ne-route-operations-brief.json', JSON.stringify(report, null, 2), 'application/json');
  }

  function exportCsv() {
    const columns = ['record_type', 'reference', 'status', 'priority_or_severity', 'origin_or_district', 'destination_or_detail'];
    const rows: string[][] = [columns];
    shipments.forEach(item => rows.push(['SHIPMENT', safe(item.shipment_code), safe(item.status), safe(item.priority), safe(item.origin), safe(item.destination)]));
    incidents.forEach(item => rows.push(['INCIDENT', safe(item.report_code), safe(item.status), safe(item.severity), safe(item.district), safe(item.incident_type)]));
    alerts.forEach(item => rows.push(['ALERT', safe(item.title), safe(item.status), safe(item.severity), '', safe(item.message)]));
    const content = rows.map(row => row.map(cell => {
      const guarded = /^[=+@-]/.test(cell) ? `'${cell}` : cell;
      return `"${guarded.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    downloadFile('ne-route-operations-register.csv', content, 'text/csv;charset=utf-8');
  }

  const dataMode = normalize(summary.data_mode) || 'UNKNOWN';

  return <div className="page-stack operations-brief-page">
    <section className="brief-hero">
      <div className="brief-hero-copy">
        <div className="brief-kicker"><span className="brief-kicker-dot"/> REGIONAL COMMAND / SITUATION INTELLIGENCE</div>
        <h1>Operations, at a glance.</h1>
        <p>A decision-ready view of incidents, essential cargo, field assets and current response priorities.</p>
        <div className="brief-hero-meta">
          <span><Clock3 size={13}/> {refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting first API refresh'}</span>
          <span className="brief-mode">{dataMode === 'SIMULATED' ? 'SIMULATED DATASET' : dataMode}</span>
        </div>
      </div>
      <div className="brief-hero-actions">
        <button className="brief-action primary" onClick={exportJson}><Download size={15}/> Export brief</button>
        <button className="brief-action" onClick={exportCsv}><FileText size={15}/> Register CSV</button>
        <button className="brief-action ghost" onClick={() => window.print()}><Printer size={15}/> Print</button>
      </div>
      <div className="brief-orb orb-a"/><div className="brief-orb orb-b"/>
      <div className="brief-hero-index"><span>REGIONAL</span><b>{String(summary.kpis.districts_monitored ?? summary.districts.length).padStart(2, '0')}</b><small>DISTRICTS MONITORED</small></div>
    </section>

    <div className="brief-disclaimer"><ShieldAlert size={15}/> {dataMode === 'SIMULATED'
      ? 'SIMULATED DATA — operational values, asset locations and scenario inputs are illustrative and are not live government information.'
      : 'Operational snapshot — verify time-sensitive conditions and all response decisions with authorized personnel.'}</div>

    <div className="brief-section-head">
      <div><span className="eyebrow">COMMAND SNAPSHOT</span><h2>Regional pulse</h2></div>
      <span className="brief-stamp">API SNAPSHOT · {dataMode}</span>
    </div>
    <div className="brief-metric-grid">
      <button className="brief-metric" onClick={() => onNavigate('incidents')}>
        <span className="brief-metric-icon coral"><AlertTriangle size={18}/></span>
        <span className="brief-metric-label">Active incidents</span>
        <strong>{summary.kpis.active_incidents ?? incidents.length}</strong>
        <small>{metrics.pendingIncidents.length} pending review</small>
      </button>
      <button className="brief-metric" onClick={() => onNavigate('shipments')}>
        <span className="brief-metric-icon gold"><Package size={18}/></span>
        <span className="brief-metric-label">Critical cargo</span>
        <strong>{metrics.criticalShipments.length}</strong>
        <small>{metrics.highPriorityShipments.length} high / critical priority</small>
      </button>
      <button className="brief-metric" onClick={() => onNavigate('vehicles')}>
        <span className="brief-metric-icon blue"><Truck size={18}/></span>
        <span className="brief-metric-label">Vehicles moving</span>
        <strong>{metrics.inTransitVehicles.length}</strong>
        <small>{vehicles.length} vehicles in current register</small>
      </button>
      <button className="brief-metric" onClick={() => onNavigate('alerts')}>
        <span className="brief-metric-icon green"><Bell size={18}/></span>
        <span className="brief-metric-label">Open alerts</span>
        <strong>{metrics.openAlerts.length}</strong>
        <small>Awaiting acknowledgement or action</small>
      </button>
    </div>

    <div className="brief-main-grid">
      <section className="panel brief-panel">
        <div className="panel-head"><div><span className="eyebrow">RESPONSE MANAGEMENT</span><h2>Recommended attention</h2></div><Activity size={19}/></div>
        <div className="brief-attention-list">
          {attention.map((item, index) => <button className="brief-attention" key={item.title} onClick={() => onNavigate(item.action)}>
            <span className={`brief-attention-index ${item.tone}`}>{String(index + 1).padStart(2, '0')}</span>
            <span className="brief-attention-copy"><b>{item.title}</b><small>{item.detail}</small></span>
            <span className="brief-attention-count">{item.count}</span><ArrowUpRight size={15}/>
          </button>)}
        </div>
        <div className="brief-panel-footer"><CheckCircle2 size={14}/> Recommendations are transparent rule-based prompts, not autonomous decisions.</div>
      </section>

      <section className="panel brief-panel">
        <div className="panel-head"><div><span className="eyebrow">OPERATIONAL DISTRIBUTION</span><h2>Shipment priority mix</h2></div><Package size={19}/></div>
        <div className="brief-bars">
          {metrics.priorities.map((item, index) => <BarRow key={item.label} label={item.label} value={item.value} total={shipments.length} tone={['coral', 'orange', 'blue', 'slate'][index]}/>)}
        </div>
        <div className="brief-panel-footer">Based on {shipments.length} shipment record(s) returned by the API.</div>
      </section>
    </div>

    <div className="brief-main-grid">
      <section className="panel brief-panel">
        <div className="panel-head"><div><span className="eyebrow">FIELD INTELLIGENCE</span><h2>Incident severity profile</h2></div><AlertTriangle size={19}/></div>
        <div className="brief-bars">
          {metrics.severity.map((item, index) => <BarRow key={item.label} label={item.label} value={item.value} total={incidents.length} tone={['coral', 'orange', 'gold', 'green'][index]}/>)}
        </div>
        <div className="brief-profile-footer"><div><span>AVG. DISTRICT ACCESSIBILITY</span><b>{metrics.averageAccessibility || '—'}<small>/100</small></b></div><button className="text-button" onClick={() => onNavigate('risk')}>View risk intelligence ↗</button></div>
      </section>

      <section className="panel brief-panel brief-register-panel">
        <div className="panel-head"><div><span className="eyebrow">DATA REGISTER</span><h2>Priority shipment register</h2></div><button className="text-button" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'View more'}</button></div>
        <div className="brief-filters" role="group" aria-label="Filter shipment register">
          {(['ALL', 'CRITICAL', 'DELAYED'] as Focus[]).map(item => <button key={item} className={focus === item ? 'active' : ''} onClick={() => setFocus(item)}>{item === 'ALL' ? 'All cargo' : item === 'CRITICAL' ? 'Critical' : 'Delayed'}</button>)}
        </div>
        <div className="brief-register">
          {filteredShipments.slice(0, expanded ? 12 : 5).map(item => <div className="brief-register-row" key={item.id || item.shipment_code}>
            <div><b>{item.shipment_code || 'Unreferenced shipment'}</b><small>{item.cargo_type} · {item.origin} → {item.destination}</small></div>
            <div className="brief-register-state"><span className={`priority ${normalize(item.priority).toLowerCase()}`}>{normalize(item.priority)}</span><small>{normalize(item.status)}</small></div>
          </div>)}
          {!filteredShipments.length && <div className="empty-state">No shipment records match this filter.</div>}
        </div>
        <button className="button secondary full" onClick={() => onNavigate('shipments')}>Open full shipment management <ArrowUpRight size={14}/></button>
      </section>
    </div>

    <section className="brief-footer-card">
      <div className="brief-footer-icon"><FileText size={19}/></div>
      <div><b>Build a shareable operations snapshot</b><p>Export the current API dataset as JSON, or download the operational register as a CSV for spreadsheet review.</p></div>
      <button className="button primary" onClick={exportJson}>Generate brief <Download size={14}/></button>
    </section>
  </div>;
}
