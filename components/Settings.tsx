
import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  User as UserIcon, 
  Check, 
  Mail, 
  Edit3, 
  Loader2, 
  Crosshair, 
  ShieldCheck,
  Database,
  Download,
  AlertTriangle,
  History,
  Bell,
  BellOff,
  Clock,
  Settings as SettingsIcon,
  ToggleLeft as ToggleOff,
  ToggleRight as ToggleOn,
  Languages,
  Globe,
  Monitor,
  Layout,
  Sun,
  Moon,
  MapPinOff
} from 'lucide-react';
import { User as UserType, Habit, QuranProgress, PrayerNotificationSettings, ClockStyle, Theme } from '../types';
import { findCoordsByCity } from '../services/prayerService';
import { db } from '../services/databaseService';

interface SettingsProps {
  user: UserType | null;
  onUpdateUser: (u: UserType) => void;
  onDetectLocation: () => void;
  resolvedLocationName: string;
  currentCoords: { lat: number, lng: number } | null;
  habits: Habit[];
  quran: QuranProgress;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, 
  onUpdateUser, 
  onDetectLocation, 
  resolvedLocationName,
  currentCoords,
  habits,
  quran
}) => {
  const [cityInput, setCityInput] = useState(user?.manualCity || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [permissionRequestHint, setPermissionRequestHint] = useState<string | null>(null);
  // Keep state in sync with browser: on mount and when tab becomes visible (e.g. user granted in another tab)
  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const sync = () => {
      setPermissionStatus(Notification.permission);
      setPermissionRequestHint(null);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  /** Call directly from click handler so the browser sees a user gesture (required for the prompt). */
  const requestNotificationPermission = () => {
    setPermissionRequestHint(null);
    if (typeof Notification === 'undefined') {
      setPermissionRequestHint('Notifications are not supported in this environment.');
      return;
    }
    if (!window.isSecureContext) {
      setPermissionRequestHint('Notifications require HTTPS or localhost. Please open this app from a secure URL.');
      return;
    }
    Notification.requestPermission()
      .then((permission) => {
        setPermissionStatus(permission);
        if (permission === 'granted' && user) {
          updateNotificationSettings({ enabled: true });
        } else if (permission === 'denied') {
          setPermissionRequestHint('Notifications are blocked. To enable them, open your browser settings (e.g. click the lock or info icon in the address bar) and set Notifications to Allow.');
        }
      })
      .catch((err) => {
        console.warn('Notification.requestPermission failed:', err);
        setPermissionStatus(Notification.permission);
        setPermissionRequestHint('Could not request permission. Try enabling notifications in your browser settings.');
      });
  };

  const updateNotificationSettings = (updates: Partial<PrayerNotificationSettings>) => {
    if (!user) return;
    const current = user.notificationSettings || {
      enabled: false,
      leadMinutes: 0,
      prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }
    };
    onUpdateUser({ ...user, notificationSettings: { ...current, ...updates } });
  };

  const togglePrayerNotification = (prayer: string) => {
    if (!user) return;
    const current = user.notificationSettings?.prayers || { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };
    updateNotificationSettings({ prayers: { ...current, [prayer]: !current[prayer] } });
  };

  const handleCitySearch = async () => {
    if (!cityInput.trim()) return;
    setLoading(true);
    const result = await findCoordsByCity(cityInput);
    if (result && user) {
      const updatedUser = { ...user, manualCoords: { lat: result.lat, lng: result.lng }, manualCity: result.name };
      onUpdateUser(updatedUser);
      setCityInput(result.name);
      setMsg('Location updated to ' + result.name);
    } else {
      setMsg('Could not find city. Try another name.');
    }
    setLoading(false);
  };

  const saveProfile = () => {
    if (user && editName.trim()) {
      onUpdateUser({ ...user, name: editName });
      setIsEditingProfile(false);
    }
  };

  const handleResetLocation = () => {
    setGpsLoading(true);
    if (user) {
      onUpdateUser({ ...user, manualCoords: undefined, manualCity: undefined });
      onDetectLocation();
      setCityInput('');
      setTimeout(() => setGpsLoading(false), 1500);
    }
  };

  /** Stop using GPS; use default (Mecca) so we no longer access device location until user taps GPS Sync. */
  const handleStopUsingLocation = () => {
    if (!user) return;
    const mecca = { lat: 21.4225, lng: 39.8262 };
    onUpdateUser({ ...user, manualCoords: mecca, manualCity: 'MECCA (DEFAULT)' });
    setCityInput('MECCA (DEFAULT)');
    setMsg('Location set to default. We will not use your device location until you tap GPS Sync.');
  };

  /** Clear saved location and re-detect (will ask for GPS again). */
  const handleClearSavedLocation = () => {
    setGpsLoading(true);
    if (user) {
      onUpdateUser({ ...user, manualCoords: undefined, manualCity: undefined });
      setCityInput('');
      onDetectLocation();
      setTimeout(() => setGpsLoading(false), 1500);
    }
  };

  const exportData = () => {
    const backup = { user, habits, quran, exportedAt: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nur_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isUsingGPS = !user?.manualCoords;
  const isDetecting = resolvedLocationName.includes('Detecting');
  // Use live browser permission so UI is correct even if state was stale (e.g. granted in another tab)
  const notificationGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
  const nSettings = user?.notificationSettings || {
    enabled: false,
    leadMinutes: 0,
    prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true }
  };

  const LOCALES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'ur-PK', name: 'Urdu (Pakistan)' },
    { code: 'ms-MY', name: 'Malay (Malaysia)' },
    { code: 'tr-TR', name: 'Turkish (Turkey)' }
  ];

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500 pb-16">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Account & Settings</h2>

      {/* Profile Section */}
      <section className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Identity</h3>
          </div>
          <span className="text-[8px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
            <ShieldCheck className="w-2.5 h-2.5" /> Secure
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800 shrink-0 overflow-hidden">
            {user?.photo ? (
              <img
                src={user.photo}
                className="w-full h-full rounded-xl object-cover"
                alt="Profile"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
              />
            ) : null}
            <span className={user?.photo ? 'hidden w-full h-full rounded-xl flex items-center justify-center bg-primary-50 dark:bg-primary-900/20' : 'w-full h-full flex items-center justify-center'}>
              <UserIcon className="w-6 h-6" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {isEditingProfile ? (
              <input autoFocus className="text-sm font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 border-none p-0.5 rounded w-full outline-primary-500" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={saveProfile} onKeyDown={(e) => e.key === 'Enter' && saveProfile()} />
            ) : (
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.name}</h3>
                <button onClick={() => setIsEditingProfile(true)} className="p-0.5 text-slate-300 hover:text-primary-500 transition-colors shrink-0"><Edit3 className="w-3 h-3" /></button>
              </div>
            )}
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate"><Mail className="w-2.5 h-2.5 shrink-0" /> {user?.email}</p>
          </div>
        </div>
      </section>

      {/* Regional Preferences Section */}
      <section className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Regional Preferences</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Theme</label>
            <div className="flex gap-1 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
              <button onClick={() => user && onUpdateUser({ ...user, theme: 'light' })} className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all text-[10px] font-bold ${user?.theme !== 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>
                <Sun className="w-3.5 h-3.5" /> Light
              </button>
              <button onClick={() => user && onUpdateUser({ ...user, theme: 'dark' })} className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all text-[10px] font-bold ${user?.theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>
                <Moon className="w-3.5 h-3.5" /> Dark
              </button>
            </div>
          </div>
          <div>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Clock</label>
            <div className="flex gap-1 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
              <button onClick={() => user && onUpdateUser({ ...user, clockStyle: 'flip' })} className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all text-[10px] font-bold ${user?.clockStyle === 'flip' || !user?.clockStyle ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>
                <Layout className="w-3.5 h-3.5" /> Flip
              </button>
              <button onClick={() => user && onUpdateUser({ ...user, clockStyle: 'digital' })} className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all text-[10px] font-bold ${user?.clockStyle === 'digital' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-700 dark:text-primary-300' : 'text-slate-400'}`}>
                <Monitor className="w-3.5 h-3.5" /> Digital
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Locale</label>
          <div className="relative">
            <select value={user?.locale || navigator.language} onChange={(e) => user && onUpdateUser({ ...user, locale: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-2 pl-3 pr-8 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500 appearance-none transition-all cursor-pointer dark:text-white">
              <optgroup label="System Default"><option value={navigator.language}>Browser ({navigator.language})</option></optgroup>
              <optgroup label="Options">{LOCALES.map(loc => <option key={loc.code} value={loc.code}>{loc.name}</option>)}</optgroup>
            </select>
            <Languages className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-accent-500" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Alerts & Notifications</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${permissionStatus === 'granted' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : permissionStatus === 'denied' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {permissionStatus === 'granted' ? 'Granted' : permissionStatus === 'denied' ? 'Denied' : 'Not set'}
            </span>
            <button onClick={() => updateNotificationSettings({ enabled: !nSettings.enabled })} className={`transition-colors p-0.5 ${nSettings.enabled ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300'}`}>
              {nSettings.enabled ? <ToggleOn className="w-6 h-6" /> : <ToggleOff className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {!notificationGranted ? (
          <div className="bg-accent-50 dark:bg-accent-950/20 border border-accent-100 dark:border-accent-900/30 p-2.5 rounded-lg space-y-1.5 text-accent-900 dark:text-accent-200">
             <div className="flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-accent-600" /><p className="text-[10px] font-medium leading-snug">Browser permission required for prayer alerts.</p></div>
             <button type="button" onClick={requestNotificationPermission} className="w-full bg-accent-600 text-white py-1.5 rounded-lg text-[10px] font-bold active:scale-[0.98] transition-all">Request permission</button>
             {permissionRequestHint ? (
               <p className="text-[10px] text-accent-800 dark:text-accent-300 leading-snug">{permissionRequestHint}</p>
             ) : null}
          </div>
        ) : (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
             <div>
                <div className="flex justify-between items-center mb-0.5"><label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Alert timing</label><span className="text-[9px] font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full">{nSettings.leadMinutes === 0 ? 'On time' : `${nSettings.leadMinutes}m before`}</span></div>
                <input type="range" min="0" max="30" step="5" value={nSettings.leadMinutes} onChange={(e) => updateNotificationSettings({ leadMinutes: parseInt(e.target.value) })} className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary-600" />
             </div>
             <div className="grid grid-cols-5 gap-1">
                {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
                   <button key={prayer} onClick={() => togglePrayerNotification(prayer)} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all text-[8px] font-bold ${nSettings.prayers[prayer] ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 opacity-60'}`}>
                     {prayer}{nSettings.prayers[prayer] ? <Bell className="w-2.5 h-2.5 fill-primary-600" /> : <BellOff className="w-2.5 h-2.5" />}
                   </button>
                ))}
             </div>
             <button onClick={() => updateNotificationSettings({ enabled: false })} className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
               Turn off prayer alerts
             </button>
          </div>
        )}
      </section>

      {/* Location / Zone Management */}
      <section className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /><h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Spiritual Zone</h3></div>
          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${isUsingGPS ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {isUsingGPS ? 'GPS' : 'Manual'}
          </span>
        </div>
        <div className={`p-2 rounded-lg border transition-all ${isDetecting ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 animate-pulse' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <div className="flex items-center justify-between"><p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Active city</p>{isDetecting && <Loader2 className="w-2.5 h-2.5 text-primary-600 animate-spin" />}</div>
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{resolvedLocationName || "Unknown"}</p>
        </div>
        <div className="relative">
          <input type="text" value={cityInput} onChange={(e) => setCityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()} placeholder="Search city..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-2 pl-3 pr-9 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" />
          <button onClick={handleCitySearch} disabled={loading} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}</button>
        </div>
        <div className="flex gap-1.5">
          <button onClick={handleResetLocation} disabled={gpsLoading || isDetecting} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border transition-all text-[10px] font-bold ${isUsingGPS ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{gpsLoading || isDetecting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Navigation className="w-2.5 h-2.5" />} GPS Sync</button>
          {isUsingGPS && (
            <button onClick={handleStopUsingLocation} className="flex items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors shrink-0">
              <MapPinOff className="w-2.5 h-2.5" /> Stop
            </button>
          )}
          {!isUsingGPS && 'geolocation' in navigator && (
            <button onClick={handleClearSavedLocation} disabled={gpsLoading} className="flex-1 py-1.5 rounded-lg bg-primary-600 text-white text-[10px] font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
              {gpsLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Navigation className="w-2.5 h-2.5" />} Use my location
            </button>
          )}
        </div>
      </section>

      {/* Database Management */}
      <section className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /><h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Storage</h3></div><span className="text-[8px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Local</span></div>
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary-500" /><span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Synced</span></div>
          <button onClick={exportData} className="py-1 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-[10px] font-bold"><Download className="w-2.5 h-2.5" /> Backup</button>
        </div>
      </section>

      <div className="p-2.5 bg-primary-50 dark:bg-primary-950/40 rounded-lg border border-primary-100 dark:border-primary-900 flex gap-1.5">
        <div className="bg-primary-100 dark:bg-primary-900/60 w-5 h-5 rounded flex items-center justify-center shrink-0"><ShieldCheck className="w-2.5 h-2.5 text-primary-600 dark:text-primary-400" /></div>
        <p className="text-[9px] text-primary-800/80 dark:text-primary-200/80 leading-snug italic">Your progress is stored locally. Your journey is private.</p>
      </div>
    </div>
  );
};

export default Settings;
