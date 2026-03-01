import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Home,
  CheckSquare,
  BookOpen,
  Utensils,
  Moon,
  Award,
  Settings as SettingsIcon,
  LogOut,
  Clock as ClockIcon,
  AlertCircle
} from 'lucide-react';
import { View, Habit, QuranProgress, User, HabitType, TaskCategory } from './types';
import { INITIAL_HABITS } from './constants';
import HabitList from './components/HabitList';
import QuranTracker from './components/QuranTracker';
import Kitchen from './components/Kitchen';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import AuthView from './components/AuthView';
import { getRamadanGreeting } from './services/geminiService';
import { fetchPrayerTimes, getCityName, PrayerData } from './services/prayerService';
import { db } from './services/databaseService';
import { setAuthToken, clearAuthToken } from './services/apiService';

function pathToView(pathname: string): View | null {
  if (pathname === '/' || pathname === '/home') return 'home';
  if (pathname === '/habits') return 'habits';
  if (pathname === '/quran') return 'quran';
  if (pathname === '/kitchen') return 'kitchen';
  if (pathname === '/settings') return 'settings';
  return null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold dark:text-white">Something went wrong.</h1>
            <p className="text-slate-500 dark:text-slate-400">Please try refreshing the application.</p>
            <button onClick={() => window.location.reload()} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold">Refresh App</button>
          </div>
        </div>
      );
    }
    return (this as React.Component<ErrorBoundaryProps, ErrorBoundaryState>).props.children;
  }
}

const FlipUnit: React.FC<{ value: string; label?: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="flex gap-0.5" aria-hidden="true">
      {value.split('').map((char, i) => (
        <div key={i} className="relative w-6 h-8 bg-slate-900 dark:bg-black rounded-md border border-white/10 flex items-center justify-center overflow-hidden shadow-xl">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 z-20" />
          <span className="text-white font-mono text-base font-bold tracking-tighter leading-none z-10">{char}</span>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />
        </div>
      ))}
    </div>
    {label && <span className="text-[7px] font-black uppercase tracking-[0.1em] text-white/40">{label}</span>}
  </div>
);

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState<string>("Welcome");
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("Locating...");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [quran, setQuran] = useState<QuranProgress>({ surah: 1, ayah: 1, juz: 1, totalAyahsRead: 0, pagesRead: 0, totalPageTarget: 604 });
  const [lastNotified, setLastNotified] = useState<string | null>(null);

  useEffect(() => {
    if (user?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.theme]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeParts = useMemo(() => {
    const locale = user?.locale || navigator.language || 'en-US';
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(currentTime);
    return {
      h: parts.find(p => p.type === 'hour')?.value || '00',
      m: parts.find(p => p.type === 'minute')?.value || '00',
      s: parts.find(p => p.type === 'second')?.value || '00',
      p: parts.find(p => p.type === 'dayPeriod')?.value || 'AM',
      full: formatter.format(currentTime)
    };
  }, [currentTime, user?.locale]);

  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init();
        const savedUserStr = localStorage.getItem('nur_active_user');
        if (savedUserStr) {
          const legacyUser = JSON.parse(savedUserStr) as User;
          const fullUser = await db.getUser(legacyUser.email);
          setUser(fullUser || legacyUser);
        }
      } catch (err) {
        console.error("Database initialization failed", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  const detectAutoLocation = useCallback((currentUser?: User) => {
    const activeUser = currentUser || user;
    if ("geolocation" in navigator) {
      setLocationName("Detecting...");
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        const city = await getCityName(latitude, longitude);
        setLocationName(city.toUpperCase());
        if (activeUser) {
          const updated = { ...activeUser, manualCoords: { lat: latitude, lng: longitude }, manualCity: city };
          setUser(updated);
          await db.saveUser(updated);
        }
      }, (err) => {
        const fallback = { lat: 21.4225, lng: 39.8262 };
        setCoords(fallback);
        setLocationName("MECCA (FALLBACK)");
      }, { enableHighAccuracy: false, timeout: 5000 });
    } else {
      setLocationName("GPS NOT SUPPORTED");
      setCoords({ lat: 21.4225, lng: 39.8262 });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      const [h, q] = await Promise.all([db.getHabits(user.email), db.getQuran(user.email)]);
      if (h) setHabits(h);
      if (q) setQuran(q);
      if (user.manualCoords) {
        setCoords(user.manualCoords);
        setLocationName(user.manualCity?.toUpperCase() || "CUSTOM ZONE");
      } else if (!coords) {
        detectAutoLocation(user);
      }
    };
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (!user?.notificationSettings?.enabled || !prayerData?.timings) return;
    const interval = setInterval(() => {
      const now = new Date();
      const settings = user.notificationSettings!;
      const leadTime = settings.leadMinutes || 0;
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      for (const pName of prayers) {
        if (!settings.prayers[pName]) continue;
        const timeStr = prayerData.timings[pName];
        if (!timeStr) continue;
        const [timePart] = timeStr.split(' ');
        const [hours, minutes] = timePart.split(':').map(Number);
        const prayerTime = new Date();
        prayerTime.setHours(hours, minutes, 0, 0);
        const alertTime = new Date(prayerTime.getTime() - (leadTime * 60000));
        const notificationKey = `${pName}-${currentDate.toISOString().split('T')[0]}`;
        if (now >= alertTime && now < prayerTime && lastNotified !== notificationKey) {
          triggerNotification(pName, leadTime);
          setLastNotified(notificationKey);
          break;
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, prayerData, lastNotified, currentDate]);

  const triggerNotification = (prayer: string, lead: number) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      const isIftar = prayer === 'Maghrib';
      const title = isIftar ? "Bountiful Iftar!" : `${prayer} Prayer`;
      const body = lead > 0 ? `${prayer} in ${lead}m.` : `Time for ${prayer}.`;
      new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/3669/3669967.png', tag: 'prayer-reminder' });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!coords) return;
      setPrayerError(null);
      try {
        const data = await fetchPrayerTimes(coords.lat, coords.lng, currentDate);
        setPrayerData(data);
      } catch (error) {
        console.error("Prayer API failed", error);
        setPrayerData(null);
        setPrayerError("Couldn't load prayer times. Check your connection or location in Settings.");
      }
    };
    loadData();
  }, [currentDate, coords]);

  useEffect(() => {
    const fetchGreeting = async () => {
      const hour = new Date().getHours();
      const aiGreeting = await getRamadanGreeting(hour);
      setGreeting(`${aiGreeting}${user ? `, ${user.name.split(' ')[0]}` : ''}`);
    };
    fetchGreeting();
    const interval = setInterval(fetchGreeting, 3600000); 
    return () => clearInterval(interval);
  }, [user]);

  const toggleHabit = (id: string) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    setHabits(prev => {
        const next = prev.map(h => {
            if (h.id === id) {
                const currentLog = h.logs[dateKey] || { completed: false, value: 0 };
                return { ...h, logs: { ...h.logs, [dateKey]: { ...currentLog, completed: !currentLog.completed } } };
            }
            return h;
        });
        if (user) db.saveHabits(user.email, next);
        return next;
    });
  };

  const updateHabitValue = (id: string, delta: number) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    setHabits(prev => {
        const next = prev.map(h => {
            if (h.id === id) {
                const currentLog = h.logs[dateKey] || { completed: false, value: 0 };
                const newValue = Math.max(0, currentLog.value + delta);
                const activeTarget = currentLog.targetOverride ?? h.targetValue ?? 1;
                return { ...h, logs: { ...h.logs, [dateKey]: { ...currentLog, value: newValue, completed: newValue >= activeTarget } } };
            }
            return h;
        });
        if (user) db.saveHabits(user.email, next);
        return next;
    });
  };

  const updateHabitTarget = (id: string, newTarget: number, forTodayOnly: boolean) => {
    const dateKey = currentDate.toISOString().split('T')[0];
    setHabits(prev => {
        const next = prev.map(h => {
            if (h.id === id) {
                if (forTodayOnly) {
                const currentLog = h.logs[dateKey] || { completed: false, value: 0 };
                return { ...h, logs: { ...h.logs, [dateKey]: { ...currentLog, targetOverride: newTarget, completed: currentLog.value >= newTarget } } };
                } else { return { ...h, targetValue: newTarget }; }
            }
            return h;
        });
        if (user) db.saveHabits(user.email, next);
        return next;
    });
  };

  const addCustomHabit = (title: string, category: TaskCategory, type: HabitType, target?: number, unit?: string) => {
    const newHabit: Habit = { id: Date.now().toString(), title, category, type, targetValue: target, unit, step: type === HabitType.COUNTER ? (unit === 'ml' ? 250 : 1) : undefined, logs: {} };
    setHabits(prev => {
        const next = [...prev, newHabit];
        if (user) db.saveHabits(user.email, next);
        return next;
    });
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => {
        const next = prev.filter(h => h.id !== id);
        if (user) db.saveHabits(user.email, next);
        return next;
    });
  };

  const changeDate = (offset: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + offset);
    setCurrentDate(next);
  };

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('nur_active_user');
    setUser(null);
    setCoords(null);
    setLocationName("Locating...");
    setHabits(INITIAL_HABITS);
    setQuran({ surah: 1, ayah: 1, juz: 1, totalAyahsRead: 0, pagesRead: 0, totalPageTarget: 604 });
    navigate('/login');
  };

  const isRamadan = prayerData?.date.hijri.month.number === 9;
  const progressPercent = useMemo(() => {
    if (habits.length === 0) return 0;
    const dateKey = currentDate.toISOString().split('T')[0];
    const completedCount = habits.filter(h => h.logs[dateKey]?.completed).length;
    return Math.round((completedCount / habits.length) * 100);
  }, [habits, currentDate]);

  const clockStyle = user?.clockStyle || 'flip';

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-primary-950 flex flex-col items-center justify-center text-white">
        <Moon className="w-16 h-16 text-accent-400 fill-accent-400 animate-pulse mb-4" />
        <h2 className="font-serif text-2xl">Initializing...</h2>
      </div>
    );
  }

    // Not logged in: redirect to /login and store return path, or show login page
  if (!user && !isInitializing) {
    if (pathname !== '/login') {
      sessionStorage.setItem('nur_return_to', pathname);
      return <Navigate to="/login" replace />;
    }
    return (
      <AuthView
        onLogin={async (u, idToken) => {
          if (idToken) setAuthToken(idToken);
          localStorage.setItem('nur_active_user', JSON.stringify(u));
          await db.saveUser(u);
          const synced = await db.syncFromServer(u.email);
          if (synced?.user) setUser(synced.user);
          else setUser(u);
          if (synced?.habits) setHabits(synced.habits);
          if (synced?.quran) setQuran(synced.quran);
          const returnTo = sessionStorage.getItem('nur_return_to') || '/';
          sessionStorage.removeItem('nur_return_to');
          navigate(returnTo, { replace: true });
        }}
      />
    );
  }

  // Logged in but on /login: redirect to home or return path
  if (user && pathname === '/login') {
    const returnTo = sessionStorage.getItem('nur_return_to') || '/';
    sessionStorage.removeItem('nur_return_to');
    return <Navigate to={returnTo} replace />;
  }

  const activeView = pathToView(pathname) ?? 'home';

  const onNavigate = (view: View) => {
    const path = view === 'home' ? '/' : `/${view}`;
    navigate(path);
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white fixed h-full z-50">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary-500 p-2 rounded-xl">
                <Moon className="w-6 h-6 text-white fill-white" />
              </div>
              <h1 className="text-xl font-serif">Nur Ramadan</h1>
            </div>
            <nav className="space-y-1">
              <SidebarLink active={pathname === '/' || pathname === '/home'} icon={<Home />} label="Home" to="/" />
              <SidebarLink active={pathname === '/habits'} icon={<CheckSquare />} label="Routine" to="/habits" />
              <SidebarLink active={pathname === '/quran'} icon={<BookOpen />} label="Quran" to="/quran" />
              <SidebarLink active={pathname === '/kitchen'} icon={<Utensils />} label="Kitchen" to="/kitchen" />
              <SidebarLink active={pathname === '/settings'} icon={<SettingsIcon />} label="Settings" to="/settings" />
            </nav>
          </div>
          <div className="mt-auto p-6 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center font-bold">{user?.name.charAt(0)}</div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.name}</p>
                <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
              </div>
              <button onClick={logout} aria-label="Logout" className="p-2 text-white/40 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </aside>

        <div className="flex-1 md:ml-64 relative flex flex-col">
          <header className={`p-6 pt-8 text-white rounded-b-[2rem] md:rounded-none shadow-xl transition-all relative overflow-hidden shrink-0 ${isRamadan ? 'bg-primary-900 dark:bg-primary-950' : 'bg-slate-800 dark:bg-slate-900'}`}>
            <div className="max-w-4xl mx-auto w-full relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h1 className="text-3xl font-serif md:text-4xl">Nur Ramadan</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                      {prayerData ? `${prayerData.date.hijri.day} ${prayerData.date.hijri.month.en}` : 'CALENDAR'}
                    </span>
                    {clockStyle === 'flip' ? (
                      <div className="flex items-end gap-1.5 px-1 py-1 bg-black/10 rounded-xl backdrop-blur-sm">
                         <FlipUnit value={timeParts.h} label="HR" />
                         <span className="text-white/20 font-bold text-xs pb-4 animate-pulse">:</span>
                         <FlipUnit value={timeParts.m} label="MIN" />
                         <span className="text-white/20 font-bold text-xs pb-4 animate-pulse">:</span>
                         <FlipUnit value={timeParts.s} label="SEC" />
                         <div className="pb-4 ml-1">
                           <span className="text-[8px] font-black bg-accent-400 text-slate-900 px-1.5 py-0.5 rounded-sm">{timeParts.p}</span>
                         </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full backdrop-blur-sm">
                        <ClockIcon className="w-4 h-4 text-accent-400" />
                        <span className="text-white font-mono text-sm font-bold">{timeParts.full}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 md:hidden">
                  <Link to="/settings" aria-label="Settings" className="bg-white/10 p-2.5 rounded-2xl border border-white/20 min-w-[44px] min-h-[44px] flex items-center justify-center"><SettingsIcon className="w-5 h-5" /></Link>
                  <button onClick={logout} aria-label="Logout" className="bg-white/10 p-2.5 rounded-2xl border border-white/20 min-w-[44px] min-h-[44px] flex items-center justify-center"><LogOut className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="mt-8 flex items-center bg-white/10 p-4 rounded-2xl border border-white/10">
                <div className="bg-accent-400 p-3 rounded-xl mr-4 text-slate-900"><Award className="w-6 h-6" /></div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-black">Spiritual Progress</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-400 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-sm font-black">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom,0px))] md:pb-12">
            <div className="max-w-4xl mx-auto w-full">
              {(activeView === 'home' || pathname === '/' || pathname === '/home') && <Dashboard habits={habits} quran={quran} prayerData={prayerData} prayerError={prayerError} locationName={locationName} currentDate={currentDate} onDateChange={changeDate} onNavigate={onNavigate} />}
              {activeView === 'habits' && <HabitList habits={habits} onToggle={toggleHabit} onUpdateValue={updateHabitValue} onUpdateTarget={updateHabitTarget} onAddHabit={addCustomHabit} onDeleteHabit={deleteHabit} prayerData={prayerData} currentDate={currentDate} />}
              {activeView === 'quran' && <QuranTracker progress={quran} setProgress={setQuran} />}
              {activeView === 'kitchen' && <Kitchen user={user} />}
              {activeView === 'settings' && <Settings user={user} onUpdateUser={async (u) => { await db.saveUser(u); setUser(u); }} onDetectLocation={() => detectAutoLocation()} resolvedLocationName={locationName} currentCoords={coords} habits={habits} quran={quran} />}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4 flex justify-around items-center z-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <NavLinkButton active={pathname === '/' || pathname === '/home'} icon={<Home />} label="Home" to="/" />
            <NavLinkButton active={pathname === '/habits'} icon={<CheckSquare />} label="Routine" to="/habits" />
            <NavLinkButton active={pathname === '/quran'} icon={<BookOpen />} label="Quran" to="/quran" />
            <NavLinkButton active={pathname === '/kitchen'} icon={<Utensils />} label="Kitchen" to="/kitchen" />
          </nav>
        </div>
      </div>
    </ErrorBoundary>
  );
};

const SidebarLink: React.FC<{ active: boolean; icon: React.ReactElement; label: string; to: string }> = ({ active, icon, label, to }) => (
  <Link to={to} aria-label={label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[44px] items-center ${active ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
    {React.cloneElement(icon, { className: 'w-5 h-5' } as React.HTMLAttributes<HTMLElement>)}
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

const NavLinkButton: React.FC<{ active: boolean; icon: React.ReactElement; label: string; to: string }> = ({ active, icon, label, to }) => (
  <Link to={to} aria-label={label} className={`flex flex-col items-center gap-1.5 transition-all min-h-[44px] justify-center min-w-[44px] ${active ? 'text-primary-700 dark:text-primary-400 scale-110' : 'text-slate-400'}`}>
    <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-primary-100 dark:bg-primary-900/30 shadow-inner' : ''}`}>
      {React.cloneElement(icon, { className: 'w-6 h-6' } as React.HTMLAttributes<HTMLElement>)}
    </div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </Link>
);

export default App;
