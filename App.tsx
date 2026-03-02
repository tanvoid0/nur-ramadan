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
  AlertCircle,
  Timer
} from 'lucide-react';
import { View, Habit, HabitLog, QuranProgress, User, HabitType, TaskCategory } from './types';
import { INITIAL_HABITS } from './constants';
import HabitList from './components/HabitList';
import QuranTracker from './components/QuranTracker';
import Kitchen from './components/Kitchen';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import PageTitleBar from './components/PageTitleBar';
import IftarTimer from './components/IftarTimer';
import AuthView from './components/AuthView';
import OnboardingTour from './components/OnboardingTour';
import SignInToUnlock from './components/SignInToUnlock';
import SignInGate from './components/SignInGate';
import { getRamadanGreeting } from './services/geminiService';
import { fetchPrayerTimes, getCityName, PrayerData } from './services/prayerService';
import { db } from './services/databaseService';
import { setAuthToken, clearAuthToken } from './services/apiService';
import { createAnonymousUser, isAnonymousUser } from './utils/auth';

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
        } else {
          setUser(createAnonymousUser());
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
    const fallback = { lat: 21.4225, lng: 39.8262 };

    if (!window.isSecureContext) {
      setCoords(fallback);
      setLocationName("USE HTTPS FOR GPS");
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocationName("GPS NOT SUPPORTED");
      setCoords(fallback);
      return;
    }

    setLocationName("Detecting...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        const city = await getCityName(latitude, longitude);
        setLocationName(city.toUpperCase());
        if (activeUser) {
          const updated = { ...activeUser, manualCoords: { lat: latitude, lng: longitude }, manualCity: city };
          setUser(updated);
          await db.saveUser(updated);
        }
      },
      (err: GeolocationPositionError) => {
        setCoords(fallback);
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            setLocationName("LOCATION DENIED");
            break;
          case 2: // POSITION_UNAVAILABLE
            setLocationName("LOCATION UNAVAILABLE");
            break;
          case 3: // TIMEOUT
            setLocationName("TIMEOUT - TRY AGAIN");
            break;
          default:
            setLocationName("MECCA (FALLBACK)");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      const [h, q] = await Promise.all([db.getHabits(user.email), db.getQuran(user.email)]);
      if (h) {
        const withIcons: Habit[] = h.map(habit => {
          if (habit.icon) return habit;
          switch (habit.title) {
            case 'Fajr Prayer':
            case 'Dhuhr Prayer':
            case 'Asr Prayer':
              return { ...habit, icon: '🕌' };
            case 'Maghrib Prayer':
              return { ...habit, icon: '🌇' };
            case 'Isha Prayer':
              return { ...habit, icon: '🌙' };
            case 'Taraweeh':
              return { ...habit, icon: '✨' };
            case 'Morning Adhkar':
              return { ...habit, icon: '🌅' };
            case 'Evening Adhkar':
              return { ...habit, icon: '🌃' };
            case 'Read Quran Pages':
              return { ...habit, icon: '📖' };
            case 'Water Intake':
              return { ...habit, icon: '💧' };
            default:
              return habit;
          }
        });
        setHabits(withIcons);
      }
      if (q) setQuran(q);
      if (user.manualCoords) {
        setCoords(user.manualCoords);
        setLocationName(user.manualCity?.toUpperCase() || "CUSTOM ZONE");
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
      new Notification(title, { body, icon: '/nur-ramadan-logo.png', tag: 'prayer-reminder' });
    }
  };

  useEffect(() => {
    if (!user?.notificationSettings?.enabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const interval = setInterval(() => {
      const now = new Date();
      const todayKey = currentDate.toISOString().split('T')[0];

      habits.forEach((habit) => {
        if (!habit.reminderEnabled || !habit.reminderTime) return;

        const [hStr, mStr] = habit.reminderTime.split(':');
        const hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

        const reminderTime = new Date(currentDate);
        reminderTime.setHours(hours, minutes, 0, 0);

        const windowMs = 5 * 60 * 1000; // 5-minute window to avoid missing the exact second
        const diff = now.getTime() - reminderTime.getTime();
        const key = `habit-${habit.id}-${todayKey}`;

        if (diff >= 0 && diff < windowMs && lastNotified !== key) {
          new Notification(habit.title, {
            body: 'Time for your routine.',
            icon: '/nur-ramadan-logo.png',
            tag: 'habit-reminder',
          });
          setLastNotified(key);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [user, habits, currentDate, lastNotified]);

  const refetchPrayerData = useCallback(async () => {
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
  }, [coords, currentDate]);

  useEffect(() => {
    refetchPrayerData();
  }, [refetchPrayerData]);

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

  const updateHabitTarget = (id: string, newTarget: number, scope: 'today' | 'future' | 'all') => {
    const dateKey = currentDate.toISOString().split('T')[0];
    setHabits(prev => {
      const next = prev.map(habit => {
        if (habit.id !== id) return habit;

        const baseTargetBefore = habit.targetValue ?? 1;

        if (scope === 'today') {
          const currentLog = habit.logs[dateKey] || { completed: false, value: 0 };
          return {
            ...habit,
            logs: {
              ...habit.logs,
              [dateKey]: {
                ...currentLog,
                targetOverride: newTarget,
                completed: currentLog.value >= newTarget,
              },
            },
          };
        }

        if (scope === 'future') {
          const updatedLogs: Record<string, HabitLog> = {};
          const entries = Object.entries(habit.logs) as [string, HabitLog][];

          entries.forEach(([key, log]) => {
            if (key < dateKey) {
              const activeTargetBefore = log.targetOverride ?? baseTargetBefore;
              // Preserve existing overrides, but lock in the previous base target for past days
              if (log.targetOverride !== undefined) {
                updatedLogs[key] = {
                  ...log,
                  completed: log.value >= log.targetOverride,
                };
              } else {
                updatedLogs[key] = {
                  ...log,
                  targetOverride: activeTargetBefore,
                  completed: log.value >= activeTargetBefore,
                };
              }
            } else {
              updatedLogs[key] = {
                ...log,
                completed: log.value >= (log.targetOverride ?? newTarget),
              };
            }
          });

          return {
            ...habit,
            targetValue: newTarget,
            logs: updatedLogs,
          };
        }

        // scope === 'all'
        const updatedLogsAll: Record<string, HabitLog> = {};
        const allEntries = Object.entries(habit.logs) as [string, HabitLog][];
        allEntries.forEach(([key, log]) => {
          updatedLogsAll[key] = {
            ...log,
            targetOverride: undefined,
            completed: log.value >= newTarget,
          };
        });

        return {
          ...habit,
          targetValue: newTarget,
          logs: updatedLogsAll,
        };
      });

      if (user) db.saveHabits(user.email, next);
      return next;
    });
  };

  const addCustomHabit = (
    title: string,
    category: TaskCategory,
    type: HabitType,
    target?: number,
    unit?: string,
    customCategoryLabel?: string,
    reminderEnabled?: boolean,
    reminderTime?: string,
    icon?: string
  ) => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      icon,
      category,
      type,
      customCategoryLabel,
      reminderEnabled,
      reminderTime,
      targetValue: target,
      unit,
      step: type === HabitType.COUNTER ? (unit === 'ml' ? 250 : 1) : undefined,
      logs: {},
    };
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

  const updateHabitIcon = (id: string, icon?: string) => {
    setHabits(prev => {
      const next = prev.map(habit =>
        habit.id === id ? { ...habit, icon } : habit
      );
      if (user) db.saveHabits(user.email, next);
      return next;
    });
  };

  const updateHabitMeta = (id: string, updates: Partial<Habit>) => {
    setHabits(prev => {
      const next = prev.map(habit =>
        habit.id === id ? { ...habit, ...updates } : habit
      );
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
    setCoords(null);
    setLocationName("Locating...");
    setHabits(INITIAL_HABITS);
    setQuran({ surah: 1, ayah: 1, juz: 1, totalAyahsRead: 0, pagesRead: 0, totalPageTarget: 604 });
    setUser(createAnonymousUser());
    navigate('/', { replace: true });
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

  // On /login: show AuthView for anonymous (Sign in), redirect to home for authenticated
  if (pathname === '/login') {
    if (user && !isAnonymousUser(user)) {
      const returnTo = sessionStorage.getItem('nur_return_to') || '/';
      sessionStorage.removeItem('nur_return_to');
      return <Navigate to={returnTo} replace />;
    }
    return (
      <AuthView
        onLogin={async (u, idToken) => {
          const wasAnonymous = user ? isAnonymousUser(user) : false;
          const anonymousEmail = wasAnonymous ? user!.email : null;

          if (idToken) setAuthToken(idToken);
          localStorage.setItem('nur_active_user', JSON.stringify(u));
          await db.saveUser(u);

          if (wasAnonymous && anonymousEmail) {
            const [anonHabits, anonQuran, anonRecipes] = await Promise.all([
              db.getHabits(anonymousEmail),
              db.getQuran(anonymousEmail),
              db.getRecipes(anonymousEmail),
            ]);
            const synced = await db.syncFromServer(u.email);
            const noSync = { skipApiSync: true };
            if (anonHabits && anonHabits.length > 0) {
              const merged = synced?.habits && synced.habits.length > 0 ? [...synced.habits, ...anonHabits] : anonHabits;
              setHabits(merged);
              await db.saveHabits(u.email, merged);
            } else if (synced?.habits) setHabits(synced.habits);
            if (anonQuran) {
              setQuran(anonQuran);
              await db.saveQuran(u.email, anonQuran);
            } else if (synced?.quran) setQuran(synced.quran);
            if (anonRecipes.length > 0) {
              for (const r of anonRecipes) await db.saveRecipe(u.email, r);
            }
            if (synced?.user) setUser(synced.user);
            else setUser(u);
            await db.clearUserData(anonymousEmail);
            localStorage.removeItem('nur_anonymous_id');
          } else {
            const synced = await db.syncFromServer(u.email);
            if (synced?.user) setUser(synced.user);
            else setUser(u);
            if (synced?.habits) setHabits(synced.habits);
            if (synced?.quran) setQuran(synced.quran);
          }

          const returnTo = sessionStorage.getItem('nur_return_to') || '/';
          sessionStorage.removeItem('nur_return_to');
          navigate(returnTo, { replace: true });
        }}
      />
    );
  }

  if (user && pathname === '/timer') {
    return (
      <ErrorBoundary>
        <IftarTimer
          prayerData={prayerData}
          prayerError={prayerError}
          locationName={locationName}
          user={user}
          onUpdateUser={async (u) => { await db.saveUser(u); setUser(u); }}
          onDetectLocation={() => detectAutoLocation()}
          onRetry={refetchPrayerData}
        />
      </ErrorBoundary>
    );
  }

  const activeView = pathToView(pathname) ?? 'home';

  const onNavigate = (view: View) => {
    const path = view === 'home' ? '/' : `/${view}`;
    navigate(path);
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <aside className="hidden md:flex w-56 flex-col bg-slate-900/95 text-white fixed h-full z-50 backdrop-blur-sm border-r border-white/5">
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="bg-primary-500 p-1.5 rounded-lg">
                <Moon className="w-5 h-5 text-white fill-white" />
              </div>
              <h1 className="text-lg font-serif font-semibold">Nur Ramadan</h1>
            </div>
            <nav className="space-y-0.5">
              <SidebarLink active={pathname === '/' || pathname === '/home'} icon={<Home />} label="Home" to="/" dataTour="home" />
              <SidebarLink active={pathname === '/timer'} icon={<Timer />} label="Iftar Timer" to="/timer" dataTour="timer" />
              <SidebarLink active={pathname === '/habits'} icon={<CheckSquare />} label="Routine" to="/habits" dataTour="habits" />
              <SidebarLink active={pathname === '/quran'} icon={<BookOpen />} label="Quran" to="/quran" dataTour="quran" />
              <SidebarLink active={pathname === '/kitchen'} icon={<Utensils />} label="Kitchen" to="/kitchen" dataTour="kitchen" />
              <SidebarLink active={pathname === '/settings'} icon={<SettingsIcon />} label="Settings" to="/settings" dataTour="settings" />
            </nav>
          </div>
          <div className="mt-auto p-4 border-t border-white/5">
            {isAnonymousUser(user) ? (
              <SignInToUnlock compact />
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                  {user?.photo ? (
                    <>
                      <img src={user.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                      <span className="hidden w-full h-full flex items-center justify-center">{user?.name?.charAt(0)}</span>
                    </>
                  ) : (
                    <span>{user?.name?.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-bold truncate">{user?.name}</p>
                  <p className="text-[9px] text-white/40 truncate">{user?.email}</p>
                </div>
                <button onClick={logout} aria-label="Logout" className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 md:ml-56 relative flex flex-col">
          {(() => {
            const hijriLabel = prayerData ? `${prayerData.date.hijri.day} ${prayerData.date.hijri.month.en}` : 'CALENDAR';
            const dateBadge = (
              <span className="text-white/70 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                {hijriLabel}
              </span>
            );
            const mobileActions = isAnonymousUser(user) ? (
              <>
                <Link to="/settings" aria-label="Settings" className="bg-white/10 p-2 rounded-xl border border-white/15 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/15 transition-colors"><SettingsIcon className="w-4 h-4" /></Link>
                <Link to="/login" aria-label="Sign in" className="bg-primary-600 text-white px-3 py-2 rounded-xl border border-primary-500 min-h-[40px] flex items-center justify-center hover:bg-primary-500 transition-colors text-sm font-bold">Sign in</Link>
              </>
            ) : (
              <>
                <Link to="/settings" aria-label="Settings" className="bg-white/10 p-2 rounded-xl border border-white/15 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/15 transition-colors"><SettingsIcon className="w-4 h-4" /></Link>
                <button onClick={logout} aria-label="Logout" className="bg-white/10 p-2 rounded-xl border border-white/15 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-white/15 transition-colors"><LogOut className="w-4 h-4" /></button>
              </>
            );
            const progressTrailing = (
              <div className="flex items-center bg-white/10 py-2.5 px-3 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="bg-accent-400 p-2 rounded-lg mr-3 text-slate-900 shrink-0"><Award className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/60 uppercase tracking-widest font-bold">Progress</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-0">
                      <div className="h-full bg-accent-400 transition-all duration-700 rounded-full" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums shrink-0">{progressPercent}%</span>
                  </div>
                </div>
              </div>
            );
            const titleBarProps = {
              isRamadan,
              timeParts,
              clockStyle,
              actions: mobileActions,
            };
            if (activeView === 'home') {
              return (
                <PageTitleBar
                  {...titleBarProps}
                  title="Nur Ramadan"
                  subtitle={dateBadge}
                  showClock
                  trailing={progressTrailing}
                  compact={false}
                />
              );
            }
            if (activeView === 'habits') {
              return (
                <PageTitleBar
                  {...titleBarProps}
                  title="Routine"
                  subtitle={dateBadge}
                  compact
                />
              );
            }
            if (activeView === 'quran') {
              return (
                <PageTitleBar
                  {...titleBarProps}
                  title="Quran"
                  subtitle={<span className="text-white/70 text-[9px] font-bold uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">Page {quran.pagesRead} of 604</span>}
                  compact
                />
              );
            }
            if (activeView === 'kitchen') {
              return (
                <PageTitleBar
                  {...titleBarProps}
                  title="Kitchen"
                  subtitle={<span className="text-white/70 text-[9px] font-bold uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">Sehri & Iftar</span>}
                  compact
                />
              );
            }
            return (
              <PageTitleBar
                {...titleBarProps}
                title="Settings"
                compact
              />
            );
          })()}

          <main className="flex-1 p-4 md:p-5 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-10">
            <div className="max-w-4xl mx-auto w-full">
              {(activeView === 'home' || pathname === '/' || pathname === '/home') && <Dashboard habits={habits} quran={quran} prayerData={prayerData} prayerError={prayerError} locationName={locationName} user={user} onUpdateUser={async (u) => { await db.saveUser(u); setUser(u); }} onDetectLocation={() => detectAutoLocation()} currentDate={currentDate} onDateChange={changeDate} onNavigate={onNavigate} />}
              {activeView === 'habits' && (
                <HabitList
                  habits={habits}
                  onToggle={toggleHabit}
                  onUpdateValue={updateHabitValue}
                  onUpdateTarget={updateHabitTarget}
                  onAddHabit={addCustomHabit}
                  onDeleteHabit={deleteHabit}
                  onUpdateHabitIcon={updateHabitIcon}
                  onUpdateHabitMeta={updateHabitMeta}
                  prayerData={prayerData}
                  currentDate={currentDate}
                />
              )}
              {activeView === 'quran' && (isAnonymousUser(user) ? <SignInGate title="Quran" reason="Sign in to track your reading progress and save your place." icon="quran" /> : <QuranTracker progress={quran} setProgress={setQuran} />)}
              {activeView === 'kitchen' && (isAnonymousUser(user) ? <SignInGate title="Kitchen" reason="Sign in to get recipe ideas and save your collection." icon="kitchen" /> : <Kitchen user={user} />)}
              {activeView === 'settings' && <Settings user={user} onUpdateUser={async (u) => { await db.saveUser(u); setUser(u); }} onDetectLocation={() => detectAutoLocation()} resolvedLocationName={locationName} currentCoords={coords} habits={habits} quran={quran} />}
            </div>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-2.5 flex justify-around items-center z-50 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <NavLinkButton active={pathname === '/' || pathname === '/home'} icon={<Home />} label="Home" to="/" dataTour="home" />
            <NavLinkButton active={pathname === '/habits'} icon={<CheckSquare />} label="Routine" to="/habits" dataTour="habits" />
            <NavLinkButton active={pathname === '/quran'} icon={<BookOpen />} label="Quran" to="/quran" dataTour="quran" />
            <NavLinkButton active={pathname === '/kitchen'} icon={<Utensils />} label="Kitchen" to="/kitchen" dataTour="kitchen" />
          </nav>
        </div>
      </div>
      <OnboardingTour showSignInStep={isAnonymousUser(user)} />
    </ErrorBoundary>
  );
};

const SidebarLink: React.FC<{ active: boolean; icon: React.ReactElement; label: string; to: string; dataTour?: string }> = ({ active, icon, label, to, dataTour }) => (
  <Link to={to} aria-label={label} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all min-h-[40px] ${active ? 'bg-primary-600 text-white shadow-md shadow-primary-900/30' : 'text-white/50 hover:bg-white/5 hover:text-white'}`} {...(dataTour ? { 'data-tour': dataTour } : {})}>
    {React.cloneElement(icon, { className: 'w-4 h-4' } as React.HTMLAttributes<HTMLElement>)}
    <span className="text-sm font-medium">{label}</span>
  </Link>
);

const NavLinkButton: React.FC<{ active: boolean; icon: React.ReactElement; label: string; to: string; dataTour?: string }> = ({ active, icon, label, to, dataTour }) => (
  <Link to={to} aria-label={label} className={`flex flex-col items-center gap-1 transition-all min-h-[44px] justify-center min-w-[48px] ${active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} {...(dataTour ? { 'data-tour': dataTour } : {})}>
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary-100 dark:bg-primary-900/40' : ''}`}>
      {React.cloneElement(icon, { className: 'w-5 h-5' } as React.HTMLAttributes<HTMLElement>)}
    </div>
    <span className="text-[8px] font-bold uppercase tracking-tight">{label}</span>
  </Link>
);

export default App;
