import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MissionControl from '../components/MissionControl';

describe('MissionControl', () => {
  it('renders multi-stop mission tools', () => {
    render(<MissionControl />);
    expect(screen.getByText(/Mission Control/i)).toBeInTheDocument();
  });
});
