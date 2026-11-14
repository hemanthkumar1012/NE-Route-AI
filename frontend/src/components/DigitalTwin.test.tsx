import { render,screen } from '@testing-library/react';
import { describe,it,expect } from 'vitest';
import DigitalTwin from './DigitalTwin';
describe('DigitalTwin workspace',()=>{
 it('renders scenario controls and all strategic response tabs',()=>{
  render(<DigitalTwin user={{email:'admin@neroute.ai',role:'ADMIN'}}/>);
  expect(screen.getByText(/Digital Twin & Strategic Response/i)).toBeInTheDocument();
  expect(screen.getByText(/Disaster digital twin/i)).toBeInTheDocument();
  expect(screen.getByText(/Relief pre-positioning/i)).toBeInTheDocument();
  expect(screen.getByText(/Incident signal fusion/i)).toBeInTheDocument();
  expect(screen.getByText(/Decision journal/i)).toBeInTheDocument();
 });
});
