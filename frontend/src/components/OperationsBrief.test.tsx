import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OperationsBrief from './OperationsBrief';

const summary = {
  data_mode: 'SIMULATED',
  kpis: { active_incidents: 2, districts_monitored: 3, delayed_shipments: 1 },
  districts: [
    { name: 'Dima Hasao', state: 'Assam', accessibility_score: 60 },
    { name: 'Cachar', state: 'Assam', accessibility_score: 80 },
  ],
};

const shipments = [
  { id: 's1', shipment_code: 'MED-001', cargo_type: 'MEDICINE', priority: 'CRITICAL', origin: 'Guwahati', destination: 'Imphal', status: 'IN_TRANSIT' },
  { id: 's2', shipment_code: 'FOOD-002', cargo_type: 'FOOD', priority: 'NORMAL', origin: 'Silchar', destination: 'Kohima', status: 'DELAYED' },
];
const vehicles = [{ id: 'v1', vehicle_code: 'NER-01', status: 'IN_TRANSIT' }];
const incidents = [
  { id: 'i1', report_code: 'INC-001', severity: 'HIGH', status: 'PENDING' },
  { id: 'i2', report_code: 'INC-002', severity: 'CRITICAL', status: 'VERIFIED' },
];
const alerts = [{ id: 'a1', title: 'Bridge watch', status: 'OPEN', severity: 'HIGH' }];

describe('OperationsBrief', () => {
  it('summarizes operational records and labels simulated data', () => {
    render(<OperationsBrief summary={summary} shipments={shipments} vehicles={vehicles} incidents={incidents} alerts={alerts} refreshedAt={null} onNavigate={vi.fn()} />);
    expect(screen.getByText('SIMULATED DATASET')).toBeInTheDocument();
    expect(screen.getByText('Recommended attention')).toBeInTheDocument();
    expect(screen.getByText('Triage open alerts')).toBeInTheDocument();
    expect(screen.getByText('Verify field reports')).toBeInTheDocument();
    expect(screen.getByText('MED-001')).toBeInTheDocument();
  });

  it('filters the shipment register by critical and delayed cargo', () => {
    render(<OperationsBrief summary={summary} shipments={shipments} vehicles={vehicles} incidents={incidents} alerts={alerts} refreshedAt={null} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Critical' }));
    expect(screen.getByText('MED-001')).toBeInTheDocument();
    expect(screen.queryByText('FOOD-002')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delayed' }));
    expect(screen.getByText('FOOD-002')).toBeInTheDocument();
    expect(screen.queryByText('MED-001')).not.toBeInTheDocument();
  });

  it('navigates to operational views from the metric cards', () => {
    const onNavigate = vi.fn();
    render(<OperationsBrief summary={summary} shipments={shipments} vehicles={vehicles} incidents={incidents} alerts={alerts} refreshedAt={null} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Open alerts'));
    expect(onNavigate).toHaveBeenCalledWith('alerts');
  });
});
