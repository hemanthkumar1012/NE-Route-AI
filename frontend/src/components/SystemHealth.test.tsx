import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SystemHealth from './SystemHealth';
import { api } from '../services/api';

vi.mock('../services/api', () => ({ api: { get: vi.fn() } }));

describe('SystemHealth workspace', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: {
      overall_status: 'READY', api: 'READY', database: 'CONNECTED', postgis: 'AVAILABLE',
      ml_service: 'READY', ml_model_loaded: true, ml_model_version: 'demo-v1',
      data_mode: 'SIMULATED_DEMO', demo_mode: true, jwt_secret_configuration: 'DEFAULT_DEMO_SECRET',
      weather_provider: 'SIMULATION_ONLY', sms_provider: 'NOT_CONFIGURED',
      email_provider: 'NOT_CONFIGURED', whatsapp_provider: 'NOT_CONFIGURED',
      vision_model: 'HUMAN_REVIEW_REQUIRED', dispatch_authority: 'HUMAN_APPROVAL_REQUIRED',
    }} as any);
  });

  it('shows real service readiness fields from the API', async () => {
    render(<SystemHealth/>);
    expect(await screen.findByText('Core services ready')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL database')).toBeInTheDocument();
    expect(screen.getAllByText('CONNECTED').length).toBeGreaterThan(0);
    expect(screen.getByText('SIMULATION_ONLY')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/system/readiness');
  });

  it('shows an actionable error when the readiness endpoint is offline', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'));
    render(<SystemHealth/>);
    await waitFor(() => expect(screen.getByText(/API could not return its readiness report/i)).toBeInTheDocument());
  });
});
