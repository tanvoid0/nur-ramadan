
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
  Moon
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

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted' && user) {
      updateNotificationSettings({ enabled: true });
    }
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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Account & Settings</h2>

      {/* Profile Section */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Identity</h3>
          </div>
          <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Secure
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800">
            {user?.photo ? <img src={user.photo} className="w-full h-full rounded-2xl object-cover" alt="Profile" /> : <UserIcon className="w-8 h-8" />}
          </div>
          <div className="flex-1">
            {isEditingProfile ? (
              <input autoFocus className="text-lg font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 border-none p-1 rounded w-full outline-primary-500" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={saveProfile} onKeyDown={(e) => e.key === 'Enter' && saveProfile()} />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{user?.name}</h3>
                <button onClick={() => setIsEditingProfile(true)} className="p-1 text-slate-300 hover:text-primary-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail className="w-3 h-3" /> {user?.email}</p>
          </div>
        </div>
      </section>

      {/* Regional Preferences Section */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Regional Preferences</h3>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Theme Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => user && onUpdateUser({ ...user, theme: 'light' })} className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${user?.theme !== 'dark' ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 opacity-60'}`}>
                <Sun className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase">Light</span>
              </button>
              <button onClick={() => user && onUpdateUser({ ...user, theme: 'dark' })} className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${user?.theme === 'dark' ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 opacity-60'}`}>
                <Moon className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase">Dark</span>
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Clock Style</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => user && onUpdateUser({ ...user, clockStyle: 'flip' })} className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${user?.clockStyle === 'flip' || !user?.clockStyle ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 opacity-60'}`}>
                <Layout className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase">Flip Clock</span>
              </button>
              <button onClick={() => user && onUpdateUser({ ...user, clockStyle: 'digital' })} className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${user?.clockStyle === 'digital' ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 opacity-60'}`}>
                <Monitor className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase">Digital</span>
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Time & Date Locale</label>
            <div className="relative">
              <select value={user?.locale || navigator.language} onChange={(e) => user && onUpdateUser({ ...user, locale: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 appearance-none transition-all cursor-pointer dark:text-white">
                <optgroup label="System Default"><option value={navigator.language}>Browser ({navigator.language})</option></optgroup>
                <optgroup label="Options">{LOCALES.map(loc => <option key={loc.code} value={loc.code}>{loc.name}</option>)}</optgroup>
              </select>
              <Languages className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent-500" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Alerts & Notifications</h3>
          </div>
          <button onClick={() => updateNotificationSettings({ enabled: !nSettings.enabled })} className={`transition-colors ${nSettings.enabled ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300'}`}>
            {nSettings.enabled ? <ToggleOn className="w-10 h-10" /> : <ToggleOff className="w-10 h-10" />}
          </button>
        </div>
        {permissionStatus !== 'granted' ? (
          <div className="bg-accent-50 dark:bg-accent-950/20 border border-accent-100 dark:border-accent-900/30 p-4 rounded-2xl space-y-3 text-accent-900 dark:text-accent-200">
             <div className="flex items-start gap-3"><AlertTriangle className="w-4 h-4 mt-1 shrink-0 text-accent-600" /><p className="text-xs font-medium leading-relaxed">Browser permissions required for prayer alerts.</p></div>
             <button onClick={requestNotificationPermission} className="w-full bg-accent-600 text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-accent-900/10 active:scale-95 transition-all">Grant Permission</button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
             <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alert Timing</label><span className="text-xs font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">{nSettings.leadMinutes === 0 ? 'On time' : `${nSettings.leadMinutes}m before`}</span></div>
                <input type="range" min="0" max="30" step="5" value={nSettings.leadMinutes} onChange={(e) => updateNotificationSettings({ leadMinutes: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-600" />
             </div>
             <div className="grid grid-cols-2 gap-3">
                {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => (
                   <button key={prayer} onClick={() => togglePrayerNotification(prayer)} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${nSettings.prayers[prayer] ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 opacity-60'}`}>
                     <span className="text-xs font-bold">{prayer}</span>{nSettings.prayers[prayer] ? <Bell className="w-3.5 h-3.5 fill-primary-600" /> : <BellOff className="w-3.5 h-3.5" />}
                   </button>
                ))}
             </div>
          </div>
        )}
      </section>

      {/* Location / Zone Management */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h3 className="font-bold text-slate-800 dark:text-slate-100">Spiritual Zone</h3></div>{isUsingGPS && <span className="text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full uppercase tracking-wider">GPS Active</span>}</div>
        <div className={`p-4 rounded-2xl mb-6 border transition-all ${isDetecting ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 animate-pulse' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <div className="flex items-center justify-between mb-1"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active City</p>{isDetecting && <Loader2 className="w-3 h-3 text-primary-600 animate-spin" />}</div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{resolvedLocationName || "Unknown"}</p>
        </div>
        <div className="relative mb-4">
          <input type="text" value={cityInput} onChange={(e) => setCityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()} placeholder="Search City..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 pr-12 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" />
          <button onClick={handleCitySearch} disabled={loading} className="absolute right-3 top-3 p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</button>
        </div>
        <button onClick={handleResetLocation} disabled={gpsLoading || isDetecting} className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all text-xs font-bold ${isUsingGPS ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{gpsLoading || isDetecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} GPS Sync</button>
      </section>

      {/* Database Management */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><h3 className="font-bold text-slate-800 dark:text-slate-100">Storage</h3></div><span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Local DB</span></div>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Health</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Check className="w-4 h-4 text-primary-500" /> Synced</p></div>
            <button onClick={exportData} className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 text-xs font-bold"><Download className="w-4 h-4" /> Backup</button>
          </div>
        </div>
      </section>

      <div className="p-4 bg-primary-50 dark:bg-primary-950/40 rounded-2xl border border-primary-100 dark:border-primary-900 flex gap-3">
        <div className="bg-primary-100 dark:bg-primary-900/60 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" /></div>
        <p className="text-[11px] text-primary-800/80 dark:text-primary-200/80 leading-snug italic">Nur Ramadan strictly preserves your progress locally. Your journey is private.</p>
      </div>
    </div>
  );
};

export default Settings;
