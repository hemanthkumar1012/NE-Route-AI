import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);
import GlobalRouteStudio from './GlobalRouteStudio';

const result = {
  origin:'Mombasa', destination:'Ho Chi Minh City', cargo_priority:'CRITICAL',
  options:[
    {objective:'FASTEST',available:true,distance_km:7900,eta_minutes:13260,mean_risk_score:22,max_risk_score:28,cost_usd:1106,co2_kg:869,
      modes:['AIR','ROAD','SEA'],segments:[
        {id:'air-1',name:'Mombasa–HCMC Indian Ocean Sea Lane',mode:'SEA',distance_km:7900,risk_score:22,status:'OPEN'},
        {id:'road-2',name:'Ho Chi Minh City urban approach',mode:'ROAD',distance_km:18,risk_score:12,status:'OPEN'},
      ]},
    {objective:'SAFEST',available:true,distance_km:8100,eta_minutes:15000,mean_risk_score:15,max_risk_score:19,cost_usd:1250,co2_kg:980,
      modes:['AIR','ROAD'],segments:[{id:'air-3',name:'Strategic air bridge',mode:'AIR',distance_km:8000,risk_score:15,status:'OPEN'}]},
    {objective:'PRIORITY',available:false,distance_km:0,eta_minutes:null,mean_risk_score:null,max_risk_score:null,cost_usd:null,co2_kg:null,modes:[],segments:[]},
    {objective:'GREENEST',available:true,distance_km:7900,eta_minutes:28800,mean_risk_score:22,max_risk_score:28,cost_usd:1106,co2_kg:869,
      modes:['SEA'],segments:[{id:'sea-1',name:'Mombasa–HCMC Indian Ocean Sea Lane',mode:'SEA',distance_km:7900,risk_score:22,status:'OPEN'}]},
  ],
};

function renderStudio(){
 const props={
  origin:'Mombasa',destination:'Ho Chi Minh City',priority:'CRITICAL',route:result,loading:false,
  onOriginChange:vi.fn(),onDestinationChange:vi.fn(),onPriorityChange:vi.fn(),onPlan:vi.fn(),
 };
 const view=render(<GlobalRouteStudio {...props}/>);
 return {view,props};
}

describe('GlobalRouteStudio',()=>{
 it('renders grouped global locations and the route comparison metrics',()=>{
  renderStudio();
  expect(screen.getByRole('group',{name:'East Africa'})).toBeInTheDocument();
  expect(screen.getByRole('group',{name:'Southeast Asia'})).toBeInTheDocument();
  expect(screen.getByText('Lowest emissions')).toBeInTheDocument();
  expect(screen.getByText('strategies available')).toBeInTheDocument();
  expect(screen.getAllByText(/kg CO₂/).length).toBeGreaterThan(0);
 });

 it('swaps the origin and destination through the supplied controls',()=>{
  const {props}=renderStudio();
  fireEvent.click(screen.getByRole('button',{name:'Swap origin and destination'}));
  expect(props.onOriginChange).toHaveBeenCalledWith('Ho Chi Minh City');
  expect(props.onDestinationChange).toHaveBeenCalledWith('Mombasa');
 });

 it('shows the selected route legs and transport mode details',async()=>{
  renderStudio();
  fireEvent.click(screen.getByRole('button',{name:/Lowest emissions/}));
  await waitFor(()=>expect(screen.getByText(/1 transport legs/)).toBeInTheDocument());
  expect(screen.getByText('Mombasa–HCMC Indian Ocean Sea Lane')).toBeInTheDocument();
  expect(screen.getByText('Sea lane segment · 7,900 km')).toBeInTheDocument();
 });

 it('disables calculation when both locations are the same',()=>{
  const props={origin:'Guwahati',destination:'Guwahati',priority:'CRITICAL',route:null,loading:false,
   onOriginChange:vi.fn(),onDestinationChange:vi.fn(),onPriorityChange:vi.fn(),onPlan:vi.fn()};
  render(<GlobalRouteStudio {...props}/>);
  expect(screen.getByRole('button',{name:/Compare route strategies/})).toBeDisabled();
 });
});
