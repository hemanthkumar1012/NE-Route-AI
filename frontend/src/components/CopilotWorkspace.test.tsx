import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CopilotWorkspace from './CopilotWorkspace';

describe('CopilotWorkspace',()=>{
 it('renders useful prompt starters and sends a submitted question',()=>{
  const onAsk=vi.fn(),onQuestionChange=vi.fn();
  render(<CopilotWorkspace question="Which medicine shipments are delayed?" answer={null} loading={false} onQuestionChange={onQuestionChange} onAsk={onAsk}/>);
  expect(screen.getByText('Delayed medicine cargo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Ask NE-Route AI/}));
  expect(onAsk).toHaveBeenCalledTimes(1);
 });

 it('lets the operator use a suggested question and shows source context',()=>{
  const onQuestionChange=vi.fn();
  const view=render(<CopilotWorkspace question="Which corridors are blocked?" answer={{
   answer:'The simulated snapshot contains one blocked corridor. Verify with a field officer.',
   data_mode:'SIMULATED',sources:['platform database snapshot','route planner'],
  }} loading={false} onQuestionChange={onQuestionChange} onAsk={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:/Critical route comparison/}));
  expect(onQuestionChange).toHaveBeenCalledWith('What is the fastest route for critical medical kits from Guwahati to Imphal?');
  expect(screen.getByText(/one blocked corridor/)).toBeInTheDocument();
  expect(screen.getByText('Route Planner')).toBeInTheDocument();
  expect(view.container.querySelector('.copilot-answer-caution')).toBeInTheDocument();
 });
});
