export interface DashboardMetrics {
  totalVehicles: number;
  totalRedos: number;
  totalWindows: number;
  avgTimeVariance: number;
  activeInstallers: number;
  jobsWithoutRedos: number;
}

export interface TopPerformer {
  installer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  vehicleCount: number;
  redoCount: number;
  successRate: number;
}

export interface RedoBreakdownItem {
  part: string;
  count: number;
  totalSqft: number;
  totalCost: number;
  avgTimeMinutes: number;
}

export interface FilterState {
  installer: string;
  dateFrom: string;
  dateTo: string;
}

export type RedoPart = "windshield" | "rollups" | "back_windshield" | "quarter";

export interface RedoFormEntry {
  part: RedoPart;
  timestamp: string;
}

export interface JobEntryFormData {
  date: string;
  installerId: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  timeVariance: number;
  notes?: string;
  redoEntries?: RedoFormEntry[];
}
