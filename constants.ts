
import { Habit, TaskCategory, HabitType } from './types';

export const INITIAL_HABITS: Habit[] = [
  { id: '1', title: 'Fajr Prayer', icon: '🕌', category: TaskCategory.PRAYER, type: HabitType.PRAYER, associatedPrayer: 'Fajr', logs: {} },
  { id: '2', title: 'Dhuhr Prayer', icon: '🕌', category: TaskCategory.PRAYER, type: HabitType.PRAYER, associatedPrayer: 'Dhuhr', logs: {} },
  { id: '3', title: 'Asr Prayer', icon: '🕌', category: TaskCategory.PRAYER, type: HabitType.PRAYER, associatedPrayer: 'Asr', logs: {} },
  { id: '4', title: 'Maghrib Prayer', icon: '🌇', category: TaskCategory.PRAYER, type: HabitType.PRAYER, associatedPrayer: 'Maghrib', logs: {} },
  { id: '5', title: 'Isha Prayer', icon: '🌙', category: TaskCategory.PRAYER, type: HabitType.PRAYER, associatedPrayer: 'Isha', logs: {} },
  { id: '6', title: 'Taraweeh', icon: '✨', category: TaskCategory.PRAYER, type: HabitType.TOGGLE, logs: {} },
  { id: '7', title: 'Morning Adhkar', icon: '🌅', category: TaskCategory.SUNNAH, type: HabitType.TOGGLE, logs: {} },
  { id: '8', title: 'Evening Adhkar', icon: '🌃', category: TaskCategory.SUNNAH, type: HabitType.TOGGLE, logs: {} },
  { id: '9', title: 'Read Quran Pages', icon: '📖', category: TaskCategory.QURAN, type: HabitType.COUNTER, targetValue: 20, unit: 'pages', step: 1, logs: {} },
  { id: '10', title: 'Water Intake', icon: '💧', category: TaskCategory.HEALTH, type: HabitType.COUNTER, targetValue: 2500, unit: 'ml', step: 250, logs: {} },
];
