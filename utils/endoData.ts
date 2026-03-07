export const PAIN_LABELS = [
  { value: 0, label: "No Pain", color: "#10b981" },
  { value: 1, label: "Mild", color: "#84cc16" },
  { value: 2, label: "Moderate", color: "#eab308" },
  { value: 3, label: "Severe", color: "#f97316" },
  { value: 4, label: "Very Severe", color: "#ef4444" },
];

export const ENERGY_LABELS = [
  { value: 0, label: "Very Low", color: "#6b7280" },
  { value: 1, label: "Low", color: "#9ca3af" },
  { value: 2, label: "Moderate", color: "#d1d5db" },
  { value: 3, label: "High", color: "#e5e7eb" },
  { value: 4, label: "Very High", color: "#f3f4f6" },
];

export const FLOW_OPTIONS = [
  { value: "none", label: "None", color: "#6b7280" },
  { value: "light", label: "Light", color: "#ef4444" },
  { value: "medium", label: "Medium", color: "#dc2626" },
  { value: "heavy", label: "Heavy", color: "#b91c1c" },
];

export interface DailyLog {
  date: string;
  pain?: number;
  energy?: number;
  flow?: string;
  mood?: string;
  notes?: string;
}

export interface CycleSettings {
  averageLength: number;
  lastPeriodDate: string;
}

export async function loadDailyLogs(): Promise<DailyLog[]> {
  // Placeholder implementation
  return [];
}

export async function loadCycleSettings(): Promise<CycleSettings> {
  // Placeholder implementation
  return {
    averageLength: 28,
    lastPeriodDate: new Date().toISOString(),
  };
}

export async function getRecentLogs(): Promise<DailyLog[]> {
  // Placeholder implementation
  return [];
}

export async function estimateCyclePhase(): Promise<string> {
  // Placeholder implementation
  return "follicular";
}
