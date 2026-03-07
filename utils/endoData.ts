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

export const MOOD_OPTIONS = [
  { value: "great", label: "Great", color: "#10b981" },
  { value: "good", label: "Good", color: "#84cc16" },
  { value: "okay", label: "Okay", color: "#eab308" },
  { value: "bad", label: "Bad", color: "#f97316" },
  { value: "terrible", label: "Terrible", color: "#ef4444" },
];

export const SYMPTOM_OPTIONS = [
  { value: "headache", label: "Headache", color: "#8b5cf6" },
  { value: "cramps", label: "Cramps", color: "#ec4899" },
  { value: "bloating", label: "Bloating", color: "#06b6d4" },
  { value: "fatigue", label: "Fatigue", color: "#64748b" },
  { value: "nausea", label: "Nausea", color: "#84cc16" },
];

export interface DailyLog {
  date: string;
  pain?: number;
  energy?: number;
  flow?: string;
  mood?: string;
  notes?: string;
  symptoms?: string[];
  images?: string[];
}

export interface CycleSettings {
  averageLength: number;
  lastPeriodDate: string;
}

export interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  reminderTime: string;
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

export async function saveCycleSettings(settings: CycleSettings): Promise<void> {
  // Placeholder implementation
  console.log("Saving cycle settings:", settings);
}

export async function clearAllEndoData(): Promise<void> {
  // Placeholder implementation
  console.log("Clearing all endo data");
}

export async function getRecentLogs(): Promise<DailyLog[]> {
  // Placeholder implementation
  return [];
}

export async function estimateCyclePhase(): Promise<string> {
  // Placeholder implementation
  return "follicular";
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  // Placeholder implementation
  console.log("Saving daily log:", log);
}

export async function getLogForDate(date: string): Promise<DailyLog | null> {
  // Placeholder implementation
  return null;
}

export async function loadSettings(): Promise<AppSettings> {
  // Placeholder implementation
  return {
    notifications: true,
    darkMode: false,
    reminderTime: "09:00",
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  // Placeholder implementation
  console.log("Saving app settings:", settings);
}

export async function resetSettings(): Promise<void> {
  // Placeholder implementation
  console.log("Resetting app settings");
}
