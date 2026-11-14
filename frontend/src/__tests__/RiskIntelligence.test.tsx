import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RiskIntelligence from '../components/RiskIntelligence';

describe('RiskIntelligence', () => {
  it('renders the intelligence workspace heading', () => {
    render(<RiskIntelligence />);
    expect(screen.getByText(/Risk Intelligence/i)).toBeInTheDocument();
  });
});
