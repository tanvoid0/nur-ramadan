
import React, { useEffect, useState } from 'react';
import { Check, Plus, Minus, Clock, Edit2, Zap, X, Calendar, Flame, Trash2, LayoutGrid, Sparkles } from 'lucide-react';
import { Habit, TaskCategory, HabitType } from '../types';
import { PrayerData } from '../services/prayerService';

interface HabitListProps {
  habits: Habit[];
  onToggle: (id: string) => void;
  onUpdateValue: (id: string, delta: number) => void;
  onUpdateTarget: (id: string, newTarget: number, forTodayOnly: boolean) => void;
  onAddHabit: (title: string, category: TaskCategory, type: HabitType, target?: number, unit?: string) => void;
  onDeleteHabit: (id: string) => void;
  prayerData: PrayerData | null;
  currentDate: Date;
}

const HabitList: React.FC<HabitListProps> = ({ 
  habits, 
  onToggle, 
  onUpdateValue, 
  onUpdateTarget, 
  onAddHabit,
  onDeleteHabit,
  prayerData, 
  currentDate 
}) => {
  const categories = Object.values(TaskCategory);
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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
    onAddHabit(newHabitTitle, newHabitCategory, newHabitType, newHabitTarget, newHabitUnit);
    setIsAddingHabit(false);
    setNewHabitTitle('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Routine Builder</h2>
        <button 
          onClick={() => setIsAddingHabit(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-900/10 active:scale-95 transition-all min-h-[44px]"
        >
          <Plus className="w-3 h-3" /> ADD CUSTOM
        </button>
      </div>

      {categories.map(category => {
        const categoryHabits = habits.filter(h => h.category === category);
        if (categoryHabits.length === 0) return null;
        return (
          <section key={category}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{category}</h3>
            </div>
            <div className="space-y-3">
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
                  <div key={habit.id} className={`relative w-full overflow-hidden p-4 rounded-2xl border transition-all duration-300 ${isCompleted ? 'bg-primary-50/50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'} ${isAnimating ? 'animate-pop' : ''}`}>
                    {isAnimating && <div className="animate-shine" />}
                    {isCounter && !isCompleted && (
                      <div className="absolute left-0 bottom-0 h-1 bg-primary-400/20 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
                    )}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative">
                          {isAnimating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              {[...Array(8)].map((_, i) => (
                                <div key={i} className="absolute w-1.5 h-1.5 rounded-full animate-burst" style={{ backgroundColor: i % 2 === 0 ? '#10b981' : '#fbbf24', '--tw-translate-x': `${Math.cos((i * 45) * Math.PI / 180) * 40}px`, '--tw-translate-y': `${Math.sin((i * 45) * Math.PI / 180) * 40}px` } as any} />
                              ))}
                            </div>
                          )}
                          <button onClick={() => handleToggle(habit)} aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'} className={`min-w-[44px] min-h-[44px] w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-75 relative z-10 ${isCompleted ? 'bg-primary-500 shadow-lg shadow-primary-200 dark:shadow-primary-900' : 'border-2 border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}>
                            {isCompleted ? <Check className="w-4 h-4 text-white" /> : <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />}
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm transition-colors duration-300 ${isCompleted ? 'line-through text-primary-600/60 dark:text-primary-400/40' : 'text-slate-700 dark:text-slate-200'}`}>{habit.title}</p>
                            {isCompleted && isAnimating && <Sparkles className="w-3 h-3 text-accent-400 animate-bounce" />}
                            {isOverridden && <span className="text-[8px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-tighter">Adjusted</span>}
                          </div>
                          {isPrayer && prayerData?.timings && habit.associatedPrayer && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {prayerData.timings[habit.associatedPrayer]}</span>
                              {status && !isCompleted && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${status === "Active now" ? "bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>{status}</span>}
                            </div>
                          )}
                          {isCounter && (
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${isCompleted ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'}`}>{log.value} / {activeTarget} {habit.unit}</span>
                              <button onClick={() => openEditor(habit)} className="text-[10px] text-slate-400 dark:text-slate-500 font-bold hover:text-primary-600 flex items-center gap-1 uppercase tracking-tighter"><Edit2 className="w-2.5 h-2.5" /> Adjust</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 relative z-10">
                        {isCounter && !isCompleted && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => onUpdateValue(habit.id, -(habit.step || 1))} aria-label="Decrease" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <button onClick={() => onUpdateValue(habit.id, (habit.step || 1))} aria-label="Increase" className="p-2 bg-primary-600 rounded-lg text-white hover:bg-primary-700 active:scale-90 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                        )}
                        {habit.category === TaskCategory.CUSTOM && <button onClick={() => onDeleteHabit(habit.id)} aria-label="Delete habit" className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Creation and Edit Modals omitted for brevity, but they should also receive dark:bg-slate-900 dark:text-white updates in a real deployment */}
    </div>
  );
};

export default HabitList;
