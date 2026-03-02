
export enum TaskCategory {
  PRAYER = 'Prayer',
  QURAN = 'Quran',
  SUNNAH = 'Sunnah',
  HEALTH = 'Health',
  CUSTOM = 'Custom'
}

export enum HabitType {
  TOGGLE = 'toggle',
  COUNTER = 'counter',
  PRAYER = 'prayer'
}

export type ClockStyle = 'flip' | 'digital';
export type Theme = 'light' | 'dark';

export interface HabitLog {
  completed: boolean;
  value: number;
  targetOverride?: number;
}

export interface PrayerNotificationSettings {
  enabled: boolean;
  leadMinutes: number; // Minutes before prayer to notify
  prayers: {
    [key: string]: boolean; // Fajr, Dhuhr, etc.
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
  manualCoords?: { lat: number; lng: number };
  manualCity?: string;
  notificationSettings?: PrayerNotificationSettings;
  locale?: string;
  clockStyle?: ClockStyle;
  theme?: Theme;
}

export interface Habit {
  id: string;
  title: string;
  /** Optional emoji or short icon label for this habit. */
  icon?: string;
  category: TaskCategory;
  type: HabitType;
  // Metadata
  /** Optional user-defined group label when category is Custom. */
  customCategoryLabel?: string;
  /** Optional daily reminder toggle for this habit. */
  reminderEnabled?: boolean;
  /** Reminder time in HH:MM (24h) for daily reminder. */
  reminderTime?: string;
  unit?: string;
  step?: number;
  targetValue?: number;
  associatedPrayer?: string;
  isSmartGoal?: boolean;
  // History: Record<YYYY-MM-DD, HabitLog>
  logs: { [date: string]: HabitLog };
}

export interface QuranProgress {
  surah: number;
  ayah: number;
  juz: number;
  totalAyahsRead: number;
  totalPageTarget?: number; // Usually 604 for full Quran
  pagesRead: number;
}

export interface Recipe {
  id: string;
  name: string;
  type: 'Sehri' | 'Iftar';
  ingredients: string[];
  instructions: string;
  nutrition: string;
  isManual?: boolean;
  createdAt: number;
}

export interface PrayerTime {
  name: string;
  time: string;
  completed: boolean;
}

export type View = 'home' | 'habits' | 'quran' | 'kitchen' | 'settings' | 'auth';
