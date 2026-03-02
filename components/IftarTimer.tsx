import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sunrise, RefreshCw, MapPin, Pencil } from 'lucide-react';
import type { User } from '../types';
import { PrayerData } from '../services/prayerService';
import LocationPickerModal from './LocationPickerModal';

type TimerMode = 'iftar' | 'sehri';

function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [timePart] = timeStr.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

interface IftarTimerProps {
  prayerData: PrayerData | null;
  prayerError: string | null;
  locationName: string;
  user: User | null;
  onUpdateUser: (u: User) => void;
  onDetectLocation: () => void;
  onRetry?: () => void;
}

const IftarTimer: React.FC<IftarTimerProps> = ({
  prayerData,
  prayerError,
  locationName,
  user,
  onUpdateUser,
  onDetectLocation,
  onRetry,
}) => {
  const [mode, setMode] = useState<TimerMode>('iftar');
  const [now, setNow] = useState(() => new Date());
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const target = useMemo(() => {
    if (!prayerData?.timings) return null;
    const timings = prayerData.timings;
    if (mode === 'iftar') {
      const maghribStr = timings.Maghrib;
      if (!maghribStr) return null;
      let targetDate = parseTimeToDate(maghribStr, new Date());
      if (targetDate <= now) {
        targetDate = new Date(targetDate);
        targetDate.setDate(targetDate.getDate() + 1);
      }
      return targetDate;
    }
    // Sehri = Fajr (end of eating window)
    const fajrStr = timings.Fajr;
    if (!fajrStr) return null;
    let targetDate = parseTimeToDate(fajrStr, new Date());
    if (targetDate <= now) {
      targetDate = new Date(targetDate);
      targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate;
  }, [prayerData, mode, now]);

  const countdown = useMemo(() => {
    if (!target || target <= now) {
      return { h: 0, m: 0, s: 0, done: true };
    }
    const diff = target.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return { h, m, s, done: false };
  }, [target, now]);

  const timeLabel = mode === 'iftar' ? prayerData?.timings?.Maghrib : prayerData?.timings?.Fajr;

  if (prayerError) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-slate-900">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-slate-300 text-sm">{prayerError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-500 font-bold text-sm hover:text-primary-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!prayerData?.timings) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-slate-900">
        <div className="text-center space-y-4 max-w-sm">
          <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mx-auto" />
          <p className="text-slate-300 text-sm">Loading prayer times...</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-500 font-bold text-sm hover:text-primary-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isIftar = mode === 'iftar';
  const bgBase = isIftar ? 'bg-primary-950' : 'bg-slate-50 dark:bg-slate-100';
  const headerLink = isIftar
    ? 'text-white/80 hover:text-white'
    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100';
  const tabBar = isIftar
    ? 'bg-white/10 border-white/10'
    : 'bg-slate-200/80 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
  const tabInactive = isIftar
    ? 'text-white/70 hover:text-white'
    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200';
  const locationChip = isIftar
    ? 'bg-white/10 border-white/15 hover:bg-white/15 text-white/80 hover:text-white'
    : 'bg-white border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';
  const countdownTitle = isIftar ? 'text-primary-100' : 'text-primary-700 dark:text-primary-400';
  const timeSubtext = isIftar ? 'text-white/50' : 'text-slate-500 dark:text-slate-400';
  const doneTitle = isIftar ? 'text-white' : 'text-slate-900 dark:text-white';
  const doneSub = isIftar ? 'text-primary-100/90' : 'text-primary-600 dark:text-primary-400';
  const cardBg = isIftar ? 'bg-white/10 border-primary-500/30' : 'bg-white dark:bg-slate-800 border-primary-200 dark:border-primary-800';
  const cardText = isIftar ? 'text-white' : 'text-slate-900 dark:text-white';
  const cardLabel = isIftar ? 'text-primary-100/80' : 'text-slate-500 dark:text-slate-400';
  const colon = isIftar ? 'text-primary-200/80' : 'text-primary-500 dark:text-primary-400';
  const hijriDate = isIftar ? 'text-primary-100/70' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={`min-h-screen flex flex-col relative ${bgBase} transition-colors duration-300`}>
      {/* Subtle background shapes – primary + base combo, not over-styled */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {isIftar ? (
          <>
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary-800/25 transition-opacity duration-300" />
            <div className="absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-primary-900/40 transition-opacity duration-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-slate-950/20 transition-opacity duration-300" />
          </>
        ) : (
          <>
            <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-primary-100/70 dark:bg-primary-900/20 transition-opacity duration-300" />
            <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-primary-50/80 dark:bg-primary-950/30 transition-opacity duration-300" />
            <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full bg-slate-200/50 dark:bg-slate-800/40 transition-opacity duration-300" />
          </>
        )}
      </div>

      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <Link
          to="/"
          className={`flex items-center gap-2 font-medium text-sm transition-colors min-h-[44px] ${headerLink}`}
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div className={`flex rounded-2xl backdrop-blur-sm border p-1 ${tabBar}`}>
          <button
            type="button"
            onClick={() => setMode('iftar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[40px] ${
              isIftar ? 'bg-primary-500 text-white shadow-md' : tabInactive
            }`}
          >
            <Moon className="w-4 h-4" /> Iftar
          </button>
          <button
            type="button"
            onClick={() => setMode('sehri')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[40px] ${
              !isIftar ? 'bg-primary-500 text-white shadow-md' : tabInactive
            }`}
          >
            <Sunrise className="w-4 h-4" /> Sehri
          </button>
        </div>
        <div className="w-16 md:w-20" aria-hidden />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <button
          type="button"
          onClick={() => setLocationModalOpen(true)}
          className={`flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border transition-colors text-xs font-bold ${locationChip}`}
          aria-label="Change prayer times location"
        >
          <MapPin className={`w-3 h-3 ${isIftar ? 'text-primary-500' : 'text-primary-600 dark:text-primary-400'}`} />
          <span>{locationName}</span>
          <Pencil className="w-2.5 h-2.5 opacity-70" />
        </button>

        <p className={`${countdownTitle} text-sm font-bold uppercase tracking-[0.2em] mb-2`}>
          Countdown to {isIftar ? 'Iftar' : 'Sehri'}
        </p>
        {timeLabel && (
          <p className={`${timeSubtext} text-xs font-medium mb-6`}>
            {isIftar ? 'Maghrib' : 'Fajr'} at {timeLabel}
          </p>
        )}

        {countdown.done ? (
          <div className="text-center">
            <p className={`text-4xl md:text-5xl font-bold mb-2 ${doneTitle}`}>
              {isIftar ? "It's time for Iftar!" : "Sehri time has ended."}
            </p>
            <p className={`${doneSub} text-sm`}>May your fast be accepted.</p>
          </div>
        ) : (
          <div className="flex gap-3 md:gap-6 font-mono">
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl backdrop-blur-md border flex items-center justify-center shadow-lg ${cardBg}`}>
                <span className={`text-4xl md:text-6xl font-bold tabular-nums ${cardText}`}>
                  {String(countdown.h).padStart(2, '0')}
                </span>
              </div>
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 ${cardLabel}`}>Hours</span>
            </div>
            <div className="flex flex-col items-center pt-4">
              <span className={`text-3xl md:text-5xl font-bold ${colon}`}>:</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl backdrop-blur-md border flex items-center justify-center shadow-lg ${cardBg}`}>
                <span className={`text-4xl md:text-6xl font-bold tabular-nums ${cardText}`}>
                  {String(countdown.m).padStart(2, '0')}
                </span>
              </div>
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 ${cardLabel}`}>Minutes</span>
            </div>
            <div className="flex flex-col items-center pt-4">
              <span className={`text-3xl md:text-5xl font-bold ${colon}`}>:</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl backdrop-blur-md border flex items-center justify-center shadow-lg ${cardBg}`}>
                <span className={`text-4xl md:text-6xl font-bold tabular-nums ${cardText}`}>
                  {String(countdown.s).padStart(2, '0')}
                </span>
              </div>
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2 ${cardLabel}`}>Seconds</span>
            </div>
          </div>
        )}

        {prayerData?.date?.hijri && (
          <p className={`${hijriDate} text-xs mt-8`}>
            {prayerData.date.hijri.day} {prayerData.date.hijri.month.en} {prayerData.date.hijri.year}
          </p>
        )}
      </main>

      <LocationPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        user={user}
        resolvedLocationName={locationName}
        onUpdateUser={onUpdateUser}
        onDetectLocation={onDetectLocation}
      />
    </div>
  );
};

export default IftarTimer;
