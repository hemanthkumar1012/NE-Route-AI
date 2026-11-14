export type UserRole = 'ADMIN' | 'GOVERNMENT_OFFICIAL' | 'LOGISTICS_MANAGER' | 'FIELD_OFFICER' | 'CITIZEN';
export interface User { id: string; name: string; email: string; role: UserRole }
export interface RiskSegment { segment_id: string; name: string; risk_score: number; risk_level: string; operational_status: string; explanation: string; data_mode: string }
export interface Shipment { id: string; shipment_code: string; cargo_type: string; priority: string; origin: string; destination: string; status: string; eta_minutes: number; deadline_minutes: number }
export interface Incident { id: string; report_code: string; incident_type: string; severity: string; status: string; description: string; district: string; coordinates: [number, number] }
export interface Alert { id: string; title: string; message: string; severity: string; status: string }
export interface DashboardSummary { data_mode: string; kpis: Record<string, number>; districts: Array<{name:string;state:string;accessibility_score:number}> }
