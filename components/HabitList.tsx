
import React, { useEffect, useState } from 'react';
import { Check, Plus, Minus, Clock, Edit2, Zap, X, Calendar, Flame, Trash2, LayoutGrid, Sparkles } from 'lucide-react';
import { Habit, TaskCategory, HabitType } from '../types';
import { PrayerData } from '../services/prayerService';

interface HabitListProps {
  habits: Habit[];
  onToggle: (id: string) => void;
  onUpdateValue: (id: string, delta: number) => void;
  onUpdateTarget: (id: string, newTarget: number, scope: 'today' | 'future' | 'all') => void;
  onAddHabit: (
    title: string,
    category: TaskCategory,
    type: HabitType,
    target?: number,
    unit?: string,
    customCategoryLabel?: string,
    reminderEnabled?: boolean,
    reminderTime?: string,
    icon?: string
  ) => void;
  onDeleteHabit: (id: string) => void;
  onUpdateHabitIcon: (id: string, icon?: string) => void;
  onUpdateHabitMeta: (id: string, updates: Partial<Habit>) => void;
  prayerData: PrayerData | null;
  currentDate: Date;
}

const ICON_OPTIONS = ['🕌', '📖', '✨', '🧎‍♂️', '🌅', '🌃', '🌙', '🍽️', '💧', '❤️', '✅'];

const HabitList: React.FC<HabitListProps> = ({ 
  habits, 
  onToggle, 
  onUpdateValue, 
  onUpdateTarget, 
  onAddHabit,
  onDeleteHabit,
  onUpdateHabitIcon,
  onUpdateHabitMeta,
  prayerData, 
  currentDate 
}) => {
  const categoryOptions = Object.values(TaskCategory);
  const [now, setNow] = useState(new Date());
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [tempTarget, setTempTarget] = useState<number>(0);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const dateKey = currentDate.toISOString().split('T')[0];

  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState<TaskCategory>(TaskCategory.CUSTOM);
  const [newHabitType, setNewHabitType] = useState<HabitType>(HabitType.TOGGLE);
  const [newHabitTarget, setNewHabitTarget] = useState(1);
  const [newHabitUnit, setNewHabitUnit] = useState('times');
  const [newHabitCustomCategory, setNewHabitCustomCategory] = useState('');
  const [newHabitReminderEnabled, setNewHabitReminderEnabled] = useState(false);
  const [newHabitReminderTime, setNewHabitReminderTime] = useState('08:00');
  const [newHabitIcon, setNewHabitIcon] = useState<string>('');

  const [editingDetailsHabit, setEditingDetailsHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<TaskCategory>(TaskCategory.CUSTOM);
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editReminderEnabled, setEditReminderEnabled] = useState(false);
  const [editReminderTime, setEditReminderTime] = useState('08:00');
  const [editIcon, setEditIcon] = useState<string>('');

  const baseCategories: TaskCategory[] = [
    TaskCategory.PRAYER,
    TaskCategory.QURAN,
    TaskCategory.SUNNAH,
    TaskCategory.HEALTH,
  ];
  const customCategoryLabels: string[] = Array.from(
    new Set(
      habits
        .filter((h) => h.category === TaskCategory.CUSTOM)
        .map((h) => h.customCategoryLabel?.trim() || TaskCategory.CUSTOM)
    )
  );
  const groupCategories: (TaskCategory | string)[] = [...baseCategories, ...customCategoryLabels];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const openDetailsEditor = (habit: Habit) => {
    setEditingDetailsHabit(habit);
    setEditTitle(habit.title);
    setEditCategory(habit.category);
    setEditCustomCategory(habit.customCategoryLabel || '');
    setEditReminderEnabled(!!habit.reminderEnabled);
    setEditReminderTime(habit.reminderTime || '08:00');
    setEditIcon(habit.icon || '');
  };

  const handleToggle = (habit: Habit) => {
    const isCurrentlyCompleted = habit.logs[dateKey]?.completed || false;
    if (!isCurrentlyCompleted) {
      setAnimatingId(habit.id);
      setTimeout(() => setAnimatingId(null), 1000);
    }
    onToggle(habit.id);
  };

  const getPrayerStatus = (pName: string) => {
    if (!prayerData || !prayerData.timings) return null;
    const timeStr = prayerData.timings[pName];
    if (!timeStr) return null;
    const [timePart] = timeStr.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    const target = new Date(currentDate);
    target.setHours(hours, minutes, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins > 0) return `Starts in ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    if (diffMins < 0 && diffMins > -60) return "Active now";
    return "Time passed";
  };

  const openEditor = (habit: Habit) => {
    const currentLog = habit.logs[dateKey];
    setEditingHabit(habit);
    setTempTarget(currentLog?.targetOverride ?? habit.targetValue ?? 0);
  };

  const handleAddSubmit = () => {
    if (!newHabitTitle.trim()) return;
    const customLabel =
      newHabitCategory === TaskCategory.CUSTOM
        ? newHabitCustomCategory.trim() || TaskCategory.CUSTOM
        : undefined;
    onAddHabit(
      newHabitTitle,
      newHabitCategory,
      newHabitType,
      newHabitTarget,
      newHabitUnit,
      customLabel,
      newHabitReminderEnabled,
      newHabitReminderTime,
      newHabitIcon || undefined
    );
    setIsAddingHabit(false);
    setNewHabitTitle('');
    setNewHabitCustomCategory('');
    setNewHabitReminderEnabled(false);
    setNewHabitIcon('');
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500 pb-16">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Routine Builder</h2>
        <button 
          onClick={() => setIsAddingHabit(true)}
          className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-md shadow-primary-900/10 active:scale-[0.98] transition-all min-h-[40px]"
        >
          <Plus className="w-3 h-3" /> ADD ROUTINE
        </button>
      </div>

      {groupCategories.map((category) => {
        const categoryHabits = habits.filter((h) => {
          if (baseCategories.includes(category as TaskCategory)) {
            return h.category === category;
          }
          const label = (h.customCategoryLabel?.trim() || TaskCategory.CUSTOM);
          return h.category === TaskCategory.CUSTOM && label === category;
        });
        if (categoryHabits.length === 0) return null;
        return (
          <section key={category}>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{category}</h3>
            </div>
            <div className="space-y-2">
              {categoryHabits.map(habit => {
                const isPrayer = habit.type === HabitType.PRAYER;
                const isCounter = habit.type === HabitType.COUNTER;
                const log = habit.logs[dateKey] || { completed: false, value: 0 };
                const activeTarget = log.targetOverride ?? habit.targetValue ?? 1;
                const isOverridden = log.targetOverride !== undefined;
                const status = isPrayer && habit.associatedPrayer ? getPrayerStatus(habit.associatedPrayer) : null;
                const progress = isCounter ? (log.value / activeTarget) * 100 : 0;
                const isCompleted = log.completed;
                const isAnimating = animatingId === habit.id;

                return (
                  <div key={habit.id} className={`relative w-full overflow-hidden p-3 rounded-xl border transition-all duration-300 ${isCompleted ? 'bg-primary-50/50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'} ${isAnimating ? 'animate-pop' : ''}`}>
                    {isAnimating && <div className="animate-shine" />}
                    {isCounter && !isCompleted && (
                      <div className="absolute left-0 bottom-0 h-0.5 bg-primary-400/20 transition-all duration-500 rounded-b-xl" style={{ width: `${Math.min(100, progress)}%` }} />
                    )}
                    <div className="flex items-center justify-between relative z-10 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative shrink-0">
                          {isAnimating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              {[...Array(8)].map((_, i) => (
                                <div key={i} className="absolute w-1.5 h-1.5 rounded-full animate-burst" style={{ backgroundColor: i % 2 === 0 ? '#10b981' : '#fbbf24', '--tw-translate-x': `${Math.cos((i * 45) * Math.PI / 180) * 40}px`, '--tw-translate-y': `${Math.sin((i * 45) * Math.PI / 180) * 40}px` } as any} />
                              ))}
                            </div>
                          )}
                          <button onClick={() => handleToggle(habit)} aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'} className={`min-w-[40px] min-h-[40px] w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 relative z-10 ${isCompleted ? 'bg-primary-500 shadow-md shadow-primary-200 dark:shadow-primary-900' : 'border-2 border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}>
                            {isCompleted ? <Check className="w-4 h-4 text-white" /> : <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />}
                          </button>
                        </div>
                        <span className="text-xl leading-none shrink-0 w-6 text-center">
                          {habit.icon ?? ''}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`font-bold text-[13px] transition-colors duration-300 truncate ${isCompleted ? 'line-through text-primary-600/60 dark:text-primary-400/40' : 'text-slate-700 dark:text-slate-200'}`}>{habit.title}</p>
                            {isCompleted && isAnimating && <Sparkles className="w-2.5 h-2.5 text-accent-400 animate-bounce shrink-0" />}
                            {isOverridden && <span className="text-[7px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded-full uppercase font-bold tracking-tighter shrink-0">Adjusted</span>}
                          </div>
                          {isPrayer && prayerData?.timings && habit.associatedPrayer && (
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5 shrink-0" /> {prayerData.timings[habit.associatedPrayer]}</span>
                              {status && !isCompleted && <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full ${status === "Active now" ? "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>{status}</span>}
                            </div>
                          )}
                          {isCounter && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${isCompleted ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'}`}>{log.value} / {activeTarget} {habit.unit}</span>
                              <button onClick={() => openEditor(habit)} className="text-[9px] text-slate-400 dark:text-slate-500 font-bold hover:text-primary-600 flex items-center gap-0.5 uppercase tracking-tighter"><Edit2 className="w-2.5 h-2.5" /> Adjust</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 relative z-10 shrink-0">
                        {isCounter && !isCompleted && (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => onUpdateValue(habit.id, -(habit.step || 1))} aria-label="Decrease" className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-transform min-w-[36px] min-h-[36px] flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <button onClick={() => onUpdateValue(habit.id, (habit.step || 1))} aria-label="Increase" className="p-1.5 bg-primary-600 rounded-md text-white hover:bg-primary-700 active:scale-95 transition-transform min-w-[36px] min-h-[36px] flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                        )}
                        <button
                          onClick={() => openDetailsEditor(habit)}
                          aria-label="Edit routine details"
                          className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-primary-500 transition-colors active:scale-95 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {habit.category === TaskCategory.CUSTOM && (
                          <button
                            onClick={() => onDeleteHabit(habit.id)}
                            aria-label="Delete habit"
                            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Add custom habit modal */}
      {isAddingHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsAddingHabit(false)}>
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Add routine</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                <input
                  type="text"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder="e.g. Morning walk"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Icon</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewHabitIcon(icon)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border text-lg transition-colors ${
                        newHabitIcon === icon
                          ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-400 dark:border-primary-500'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="leading-none">{icon}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewHabitIcon('')}
                    className="px-2 h-8 rounded-lg border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"
                  >
                    No icon
                  </button>
                </div>
                <input
                  type="text"
                  value={newHabitIcon}
                  onChange={(e) => setNewHabitIcon(e.target.value)}
                  maxLength={3}
                  placeholder="Or paste your own icon (emoji)"
                  className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2 px-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value as TaskCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {newHabitCategory === TaskCategory.CUSTOM && (
                  <input
                    type="text"
                    value={newHabitCustomCategory}
                    onChange={(e) => setNewHabitCustomCategory(e.target.value)}
                    placeholder="e.g. Productivity, Family, Work"
                    className="mt-2 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewHabitType(HabitType.TOGGLE)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-colors ${newHabitType === HabitType.TOGGLE ? 'bg-primary-600 text-white border-primary-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                  >
                    Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHabitType(HabitType.COUNTER)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-colors ${newHabitType === HabitType.COUNTER ? 'bg-primary-600 text-white border-primary-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                  >
                    Counter
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daily reminder</label>
                  <button
                    type="button"
                    onClick={() => setNewHabitReminderEnabled((v) => !v)}
                    className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border transition-colors ${newHabitReminderEnabled ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                  >
                    {newHabitReminderEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                {newHabitReminderEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={newHabitReminderTime}
                      onChange={(e) => setNewHabitReminderTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2 px-3 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>
              {newHabitType === HabitType.COUNTER && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Target</label>
                    <input
                      type="number"
                      min={1}
                      value={newHabitTarget}
                      onChange={(e) => setNewHabitTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Unit</label>
                    <select
                      value={newHabitUnit}
                      onChange={(e) => setNewHabitUnit(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="times">times</option>
                      <option value="pages">pages</option>
                      <option value="ml">ml</option>
                      <option value="minutes">minutes</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => { setIsAddingHabit(false); setNewHabitTitle(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={!newHabitTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Add routine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust routine target modal */}
      {editingHabit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEditingHabit(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Adjust routine target</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Update how many {editingHabit.unit || 'times'} you&apos;d like to complete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{editingHabit.title}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingHabit(null)}
                aria-label="Close"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Icon
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        onUpdateHabitIcon(editingHabit.id, icon);
                        setEditingHabit({ ...editingHabit, icon });
                      }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border text-lg transition-colors ${
                        editingHabit.icon === icon
                          ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-400 dark:border-primary-500'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="leading-none">{icon}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateHabitIcon(editingHabit.id, undefined);
                      setEditingHabit({ ...editingHabit, icon: undefined });
                    }}
                    className="px-2 h-8 rounded-lg border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800"
                  >
                    No icon
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  New daily target
                </label>
                <input
                  type="number"
                  min={1}
                  value={tempTarget}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setTempTarget(Number.isNaN(value) ? 1 : Math.max(1, value));
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Apply this change to
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateTarget(editingHabit.id, tempTarget, 'today');
                      setEditingHabit(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 text-left text-xs font-semibold text-slate-700 dark:text-slate-100 hover:border-primary-500 hover:bg-primary-50/60 dark:hover:bg-primary-900/20 active:scale-[0.99] transition-all"
                  >
                    <span>
                      Today only
                      <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        Adjust just for {dateKey}
                      </span>
                    </span>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateTarget(editingHabit.id, tempTarget, 'future');
                      setEditingHabit(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 text-left text-xs font-semibold text-slate-700 dark:text-slate-100 hover:border-primary-500 hover:bg-primary-50/60 dark:hover:bg-primary-900/20 active:scale-[0.99] transition-all"
                  >
                    <span>
                      From today forward
                      <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        Keep past days the same, update today and future
                      </span>
                    </span>
                    <Flame className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateTarget(editingHabit.id, tempTarget, 'all');
                      setEditingHabit(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-primary-600 text-left text-xs font-semibold text-white hover:bg-primary-500 active:scale-[0.99] transition-all shadow-sm shadow-primary-900/30"
                  >
                    <span>
                      All days
                      <span className="block text-[10px] font-normal text-primary-100/90">
                        Use this target for your whole history
                      </span>
                    </span>
                    <Zap className="w-4 h-4 text-primary-100" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit routine details modal */}
      {editingDetailsHabit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setEditingDetailsHabit(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Edit routine</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Update how this routine is labeled and grouped. To adjust daily targets, use the target controls.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDetailsHabit(null)}
                aria-label="Close"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Icon
                </label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  maxLength={3}
                  placeholder="Paste an emoji or short icon"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2 px-3 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {editCategory === TaskCategory.CUSTOM && (
                  <input
                    type="text"
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    placeholder="e.g. Productivity, Family, Work"
                    className="mt-2 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Daily reminder
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditReminderEnabled((v) => !v)}
                    className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border transition-colors ${
                      editReminderEnabled
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {editReminderEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                {editReminderEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={editReminderTime}
                      onChange={(e) => setEditReminderTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2 px-3 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditingDetailsHabit(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingDetailsHabit) return;
                  const trimmedTitle = editTitle.trim();
                  if (!trimmedTitle) return;
                  const trimmedIcon = editIcon.trim();
                  const customLabel =
                    editCategory === TaskCategory.CUSTOM
                      ? editCustomCategory.trim() || TaskCategory.CUSTOM
                      : undefined;
                  onUpdateHabitMeta(editingDetailsHabit.id, {
                    title: trimmedTitle,
                    category: editCategory,
                    customCategoryLabel: customLabel,
                    reminderEnabled: editReminderEnabled,
                    reminderTime: editReminderEnabled ? editReminderTime : undefined,
                    icon: trimmedIcon || undefined,
                  });
                  setEditingDetailsHabit(null);
                }}
                disabled={!editTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitList;
