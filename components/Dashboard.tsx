
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  Timer,
  BookOpen,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  Flame,
  History,
  CloudOff,
  AlertCircle,
  Maximize2,
  Pencil
} from 'lucide-react';
import { Habit, QuranProgress, User, View } from '../types';
import { getSpiritualReflection, getLocalReflection, isGeminiAvailable } from '../services/geminiService';
import { PrayerData } from '../services/prayerService';
import { isAnonymousUser } from '../utils/auth';
import LocationPickerModal from './LocationPickerModal';
import SignInToUnlock from './SignInToUnlock';

const QUOTABLE_URL = 'https://api.quotable.io/random';

async function fetchPublicQuote(): Promise<string> {
  const today = new Date().toDateString();
  const cached = localStorage.getItem('nur_public_quote_text');
  const cachedDate = localStorage.getItem('nur_public_quote_date');
  if (cached && cachedDate === today) return cached;
  const res = await fetch(QUOTABLE_URL);
  if (!res.ok) throw new Error('Quote API failed');
  const data = await res.json();
  const text = data.content + (data.author ? ` — ${data.author}` : '');
  localStorage.setItem('nur_public_quote_text', text);
  localStorage.setItem('nur_public_quote_date', today);
  return text;
}

interface DashboardProps {
  habits: Habit[];
  quran: QuranProgress;
  prayerData: PrayerData | null;
  prayerError?: string | null;
  locationName: string;
  user: User | null;
  onUpdateUser: (u: User) => void;
  onDetectLocation: () => void;
  currentDate: Date;
  onDateChange: (offset: number) => void;
  onNavigate: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  habits,
  quran,
  prayerData,
  prayerError,
  locationName,
  user,
  onUpdateUser,
  onDetectLocation,
  currentDate,
  onDateChange,
  onNavigate,
}) => {
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [reflection, setReflection] = useState<string>("Loading inspiration...");
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [nextPrayerName, setNextPrayerName] = useState<string>("Calculating...");
  const [isOffline, setIsOffline] = useState(false);
  const [wisdomLoading, setWisdomLoading] = useState(true);
  const [aiReflectionLoading, setAiReflectionLoading] = useState(false);

  // Default wisdom: public API (no AI). Fallback to local list on failure. No automatic AI calls.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setWisdomLoading(true);
      try {
        const text = await fetchPublicQuote();
        if (!cancelled) setReflection(text);
        if (!cancelled) setIsOffline(false);
      } catch {
        if (!cancelled) {
          setReflection(getLocalReflection());
          setIsOffline(true);
        }
      } finally {
        if (!cancelled) setWisdomLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleGetAiReflection = async () => {
    if (!isGeminiAvailable()) return;
    setAiReflectionLoading(true);
    try {
      const text = await getSpiritualReflection();
      setReflection(text);
      setIsOffline(false);
    } catch {
      setReflection(getLocalReflection());
    } finally {
      setAiReflectionLoading(false);
    }
  };

  const isToday = new Date().toDateString() === currentDate.toDateString();
  const isPastDay = currentDate < new Date() && !isToday;
  const isRamadan = prayerData?.date.hijri.month.number === 9;

  const weeklyOutlook = useMemo(() => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const totalHabits = habits.length;
      const completed = habits.filter(h => h.logs[key]?.completed).length;
      const progress = totalHabits > 0 ? (completed / totalHabits) : 0;
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        date: d.toLocaleDateString(undefined, { day: 'numeric' }),
        progress,
        isToday: d.toDateString() === new Date().toDateString(),
        isCurrentSelected: d.toDateString() === currentDate.toDateString(),
        isFuture: d > new Date(),
        key
      });
    }
    return days;
  }, [habits, currentDate]);

  const smartTips = useMemo(() => {
    const tips = [];
    const daysLeft = 30 - (parseInt(prayerData?.date.hijri.day || "1"));
    const pagesLeft = (quran.totalPageTarget || 604) - quran.pagesRead;
    const requiredDailyPace = Math.ceil(pagesLeft / Math.max(1, daysLeft));
    
    if (pagesLeft > 0 && isRamadan) {
      tips.push({ icon: <BookOpen className="w-4 h-4" />, text: `Read ${requiredDailyPace} pages daily to finish by Eid.`, type: 'quran' });
    }

    const todayKey = new Date().toISOString().split('T')[0];
    const waterHabit = habits.find(h => h.title.toLowerCase().includes('water'));
    const waterLog = waterHabit?.logs[todayKey];
    if (waterHabit && (waterLog?.value || 0) < (waterHabit.targetValue || 0) * 0.3 && isToday) {
      tips.push({ icon: <Zap className="w-4 h-4" />, text: "Hydration alert: You're below 30% goal.", type: 'health' });
    }
    return tips;
  }, [quran, habits, prayerData, isRamadan, isToday]);

  useEffect(() => {
    if (!prayerData || !prayerData.timings || !isToday) {
      setCountdown("--:--:--");
      setNextPrayerName(isRamadan ? "Ramadan View" : "Prayer View");
      return;
    }
    const updateCountdown = () => {
      const now = new Date();
      const timings = prayerData.timings;
      const prayerNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
      let nextTarget: Date | null = null;
      let nextName = "";
      for (const name of prayerNames) {
        const timeStr = timings[name];
        if (!timeStr) continue;
        const [timePart] = timeStr.split(' ');
        const [hours, minutes] = timePart.split(':').map(Number);
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);
        if (target > now) {
          nextTarget = target;
          nextName = isRamadan ? (name === 'Maghrib' ? 'Iftar' : name === 'Fajr' ? 'Sehri Ends' : name) : name;
          break;
        }
      }
      if (!nextTarget) {
        const fajrTime = timings["Fajr"];
        if (fajrTime) {
          const [timePart] = fajrTime.split(' ');
          const [hours, minutes] = timePart.split(':').map(Number);
          nextTarget = new Date();
          nextTarget.setDate(nextTarget.getDate() + 1);
          nextTarget.setHours(hours, minutes, 0, 0);
          nextName = isRamadan ? "Sehri Ends (Tomorrow)" : "Fajr (Tomorrow)";
        }
      }
      if (nextTarget) {
        const diff = nextTarget.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        setNextPrayerName(nextName);
      }
    };
    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => clearInterval(timer);
  }, [prayerData, isToday, isRamadan]);

  const prayersToDisplay = prayerData?.timings ? [
    { name: 'Fajr', time: prayerData.timings.Fajr },
    { name: 'Dhuhr', time: prayerData.timings.Dhuhr },
    { name: 'Asr', time: prayerData.timings.Asr },
    { name: 'Maghrib', time: prayerData.timings.Maghrib },
    { name: 'Isha', time: prayerData.timings.Isha }
  ] : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {prayerError && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{prayerError}</span>
          <button onClick={() => onNavigate('settings')} className="ml-auto text-xs font-bold underline min-h-[44px] flex items-center">Settings</button>
        </div>
      )}
      {/* Date Switcher */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <button onClick={() => onDateChange(-1)} aria-label="Previous day" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{isToday ? "Today" : currentDate.toLocaleDateString(undefined, { weekday: 'long' })}</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
        <button onClick={() => onDateChange(1)} aria-label="Next day" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Outlook */}
        <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3 h-3" /> Spiritual Momentum
            </h3>
            <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">Weekly Trend</span>
          </div>
          <div className="flex justify-between items-end gap-2 px-1 flex-1">
            {weeklyOutlook.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                 <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-24 relative overflow-hidden flex items-end shadow-inner border border-slate-50 dark:border-slate-700">
                    <div 
                      className={`w-full transition-all duration-700 rounded-b-full ${day.isFuture ? 'bg-slate-200 dark:bg-slate-700 opacity-30' : 'bg-primary-500 shadow-[0_-4px_12px_rgba(16,185,129,0.3)]'}`} 
                      style={{ height: `${Math.max(4, day.progress * 100)}%` }}
                    />
                    {day.isCurrentSelected && <div className="absolute inset-0 border-2 border-primary-500/30 rounded-full animate-pulse" />}
                 </div>
                 <span className={`text-[9px] font-bold ${day.isCurrentSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}>{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Status Card & Timer */}
        <div className="flex flex-col gap-4">
          <Link to="/timer" className="block flex-1">
            <section className={`p-6 rounded-3xl shadow-md border flex items-center justify-between relative overflow-hidden group transition-all h-full hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 ${isRamadan ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:scale-110 transition-transform"><Activity className="w-24 h-24" /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
                  <Timer className={`w-3 h-3 ${isRamadan ? 'text-primary-500' : 'text-slate-400'}`} />
                  <span>{isToday ? 'Next Milestone' : isPastDay ? 'Selected day' : 'Timeline'}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {isToday ? nextPrayerName : (isRamadan ? 'Ramadan View' : 'Schedule')}
                </h2>
                <p className={`${isRamadan ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'} font-medium text-sm`}>
                  {prayerData ? `${prayerData.date.hijri.month.en} ${prayerData.date.hijri.year}` : 'Ramadan Tracker'}
                </p>
              </div>
              {isToday && (
                <div className="text-right relative z-10 flex flex-col items-end gap-1">
                  <div className={`text-3xl font-mono font-bold tracking-tighter ${isRamadan ? 'text-primary-800 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>{countdown}</div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    Remaining <Maximize2 className="w-3 h-3 text-primary-500" />
                  </p>
                </div>
              )}
            </section>
          </Link>

          {/* Daily Wisdom: public quote or local; optional "Get AI reflection" only when user taps */}
          <section className="bg-accent-50 dark:bg-accent-950/20 border border-accent-100 dark:border-accent-900/30 p-5 rounded-3xl shadow-sm flex-1 relative group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-600" />
                <h3 className="text-xs font-bold text-accent-700 dark:text-accent-400 uppercase tracking-widest">Daily Wisdom</h3>
              </div>
              <div className="flex items-center gap-2">
                {isOffline && (
                  <div className="flex items-center gap-1 text-[8px] font-bold text-accent-500 uppercase tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">
                    <CloudOff className="w-2.5 h-2.5" /> Local
                  </div>
                )}
                {/* Only when user taps do we call Gemini; default wisdom is public API / local to avoid overuse */}
                {isGeminiAvailable() && (
                  <button
                    type="button"
                    onClick={handleGetAiReflection}
                    disabled={aiReflectionLoading || wisdomLoading}
                    aria-label="Regenerate with AI"
                    className="p-2 rounded-xl border border-accent-200 dark:border-accent-800 hover:bg-accent-100 dark:hover:bg-accent-900/30 disabled:opacity-50 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                  >
                    {aiReflectionLoading ? (
                      <RefreshCw className="w-4 h-4 text-accent-600 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-accent-700 dark:text-accent-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
            {wisdomLoading ? (
              <p className="text-accent-700/60 dark:text-accent-300/60 text-sm italic">Loading…</p>
            ) : (
              <p className="text-accent-900/80 dark:text-accent-200/80 text-sm leading-relaxed italic">"{reflection}"</p>
            )}
          </section>
        </div>
      </div>

      {/* Prayer Times Quick View */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Prayer Times</h3>
          <button
            type="button"
            onClick={() => setLocationModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full text-[10px] text-slate-600 dark:text-slate-400 font-bold transition-colors min-h-[32px]"
            aria-label="Change prayer times location"
          >
            <MapPin className="w-3 h-3 text-primary-500" />
            <span>{locationName}</span>
            <Pencil className="w-2.5 h-2.5 opacity-60" />
          </button>
        </div>
        <LocationPickerModal
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          user={user}
          resolvedLocationName={locationName}
          onUpdateUser={onUpdateUser}
          onDetectLocation={onDetectLocation}
        />
        {!prayerData ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
              <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Determining Timings...</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {prayersToDisplay.map((p, i) => {
              const showIftar = isRamadan && p.name === 'Maghrib';
              const showSehri = isRamadan && p.name === 'Fajr';
              return (
                <div key={i} className={`p-3 rounded-2xl border text-center transition-all shadow-sm ${showIftar ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                  <p className={`text-[8px] font-bold uppercase mb-1 truncate ${showIftar ? 'text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>
                    {showIftar ? 'Iftar' : showSehri ? 'Sehri' : p.name}
                  </p>
                  <p className={`text-xs font-bold ${showIftar ? 'text-primary-900 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>{p.time}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        <button onClick={() => onNavigate('habits')} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-left shadow-sm hover:shadow-md transition-all group">
          <div className="bg-primary-50 dark:bg-primary-900/30 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
            <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {habits.filter(h => h.logs[currentDate.toISOString().split('T')[0]]?.completed).length}/{habits.length}
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
            Tasks Completed <ArrowRight className="w-4 h-4 ml-1" />
          </p>
        </button>
        <button onClick={() => onNavigate('quran')} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-left shadow-sm hover:shadow-md transition-all group">
          <div className="bg-accent-50 dark:bg-accent-900/30 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
            <BookOpen className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">Surah {quran.surah}</p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
            Juz {quran.juz} • Ayah {quran.ayah} <ArrowRight className="w-4 h-4 ml-1" />
          </p>
        </button>
      </div>

      {user && isAnonymousUser(user) && (
        <SignInToUnlock className="mt-2" />
      )}
    </div>
  );
};

export default Dashboard;
