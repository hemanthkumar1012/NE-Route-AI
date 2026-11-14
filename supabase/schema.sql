-- NE-Route AI initial PostgreSQL schema for Supabase.
-- Apply only to a dedicated or explicitly approved project.
-- The API connects with the server-side postgres role; the browser does not access these tables directly.

create table if not exists public.users (
  id varchar(36) primary key,
  email varchar(255) not null,
  full_name varchar(150) not null,
  role varchar(40) not null default 'FIELD_OFFICER',
  password_hash varchar(255) not null,
  is_active boolean not null default true
);
create unique index if not exists ix_users_email on public.users(email);

create table if not exists public.districts (
  id varchar(36) primary key,
  name varchar(120) not null unique,
  state_name varchar(100) not null,
  accessibility_score integer not null default 80,
  coordinates json not null default '[]'::json
);

create table if not exists public.road_segments (
  id varchar(36) primary key,
  external_id varchar(80) not null,
  name varchar(180) not null,
  from_node varchar(80) not null,
  to_node varchar(80) not null,
  distance_km double precision not null,
  base_eta_minutes integer not null,
  risk_score integer not null default 20,
  risk_level varchar(30) not null default 'SAFE',
  operational_status varchar(30) not null default 'OPEN',
  terrain varchar(40) not null default 'HILLY',
  slope_percent double precision not null default 8,
  elevation_m double precision not null default 600,
  rainfall_24h_mm double precision not null default 20,
  forecast_rainfall_mm double precision not null default 15,
  historical_incidents_30d integer not null default 0,
  traffic_index double precision not null default 0.2,
  road_condition_score double precision not null default 0.8,
  bridge_vulnerability double precision not null default 0.1,
  coordinates json not null default '[]'::json
);
create unique index if not exists ix_road_segments_external_id on public.road_segments(external_id);

create table if not exists public.incidents (
  id varchar(36) primary key,
  report_code varchar(50) not null,
  incident_type varchar(40) not null,
  severity varchar(30) not null,
  status varchar(30) not null default 'PENDING',
  description text not null,
  district_name varchar(120) not null,
  coordinates json not null,
  reported_by varchar(255) not null,
  verified_by varchar(255),
  verification_notes text,
  reported_at timestamptz not null default now()
);
create unique index if not exists ix_incidents_report_code on public.incidents(report_code);

create table if not exists public.vehicles (
  id varchar(36) primary key,
  vehicle_code varchar(40) not null unique,
  driver_name varchar(120) not null,
  status varchar(30) not null default 'IN_TRANSIT',
  speed_kmph double precision not null default 0,
  coordinates json not null,
  shipment_code varchar(50),
  gps_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id varchar(36) primary key,
  shipment_code varchar(50) not null,
  cargo_type varchar(40) not null,
  priority varchar(30) not null,
  origin varchar(120) not null,
  destination varchar(120) not null,
  status varchar(30) not null default 'IN_TRANSIT',
  eta_minutes integer not null,
  vehicle_code varchar(40),
  deadline_minutes integer not null default 240
);
create unique index if not exists ix_shipments_shipment_code on public.shipments(shipment_code);

create table if not exists public.alerts (
  id varchar(36) primary key,
  title varchar(200) not null,
  message text not null,
  severity varchar(30) not null default 'WARNING',
  status varchar(30) not null default 'OPEN',
  entity_type varchar(50) not null,
  entity_id varchar(80) not null,
  assigned_to varchar(255),
  created_at timestamptz not null default now()
);

create table if not exists public.weather_observations (
  id varchar(36) primary key,
  district_name varchar(120) not null,
  rainfall_24h_mm double precision not null,
  forecast_rainfall_mm double precision not null,
  observed_at timestamptz not null default now()
);

create table if not exists public.logistics_facilities (
  id varchar(36) primary key,
  code varchar(40) not null,
  name varchar(150) not null,
  node_name varchar(80) not null,
  facility_type varchar(40) not null default 'RELIEF_HUB',
  coordinates json not null default '[]'::json,
  capacity_units integer not null default 1000,
  is_operational boolean not null default true
);
create unique index if not exists ix_logistics_facilities_code on public.logistics_facilities(code);

create table if not exists public.resource_stocks (
  id varchar(36) primary key,
  facility_id varchar(36) not null references public.logistics_facilities(id),
  resource_type varchar(50) not null,
  quantity integer not null default 0,
  reorder_level integer not null default 0,
  unit varchar(30) not null default 'units'
);
create index if not exists ix_resource_stocks_facility_id on public.resource_stocks(facility_id);
create index if not exists ix_resource_stocks_resource_type on public.resource_stocks(resource_type);

create table if not exists public.decision_events (
  id integer generated by default as identity primary key,
  actor_email varchar(255) not null,
  event_type varchar(40) not null,
  entity_type varchar(50) not null,
  entity_ref varchar(100) not null,
  summary varchar(240) not null,
  rationale text not null,
  event_data json not null default '{}'::json,
  previous_hash varchar(64) not null,
  event_hash varchar(64) not null unique,
  created_at timestamptz not null default now()
);
create index if not exists ix_decision_events_actor_email on public.decision_events(actor_email);
create index if not exists ix_decision_events_event_type on public.decision_events(event_type);
create index if not exists ix_decision_events_entity_ref on public.decision_events(entity_ref);
create index if not exists ix_decision_events_created_at on public.decision_events(created_at);

-- Defense in depth: direct browser Data API access is not part of this architecture.
alter table public.users enable row level security;
alter table public.districts enable row level security;
alter table public.road_segments enable row level security;
alter table public.incidents enable row level security;
alter table public.vehicles enable row level security;
alter table public.shipments enable row level security;
alter table public.alerts enable row level security;
alter table public.weather_observations enable row level security;
alter table public.logistics_facilities enable row level security;
alter table public.resource_stocks enable row level security;
alter table public.decision_events enable row level security;

revoke all on table
  public.users, public.districts, public.road_segments, public.incidents,
  public.vehicles, public.shipments, public.alerts, public.weather_observations,
  public.logistics_facilities, public.resource_stocks, public.decision_events
from anon, authenticated;

-- Keep the photo bucket private. The backend uses the server-only service key.
insert into storage.buckets (id, name, public)
values ('incident-media', 'incident-media', false)
on conflict (id) do nothing;
