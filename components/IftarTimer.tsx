import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sunrise, RefreshCw } from 'lucide-react';
import { PrayerData } from '../services/prayerService';

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
  onRetry?: () => void;
}

const IftarTimer: React.FC<IftarTimerProps> = ({ prayerData, prayerError, onRetry }) => {
  const [mode, setMode] = useState<TimerMode>('iftar');
  const [now, setNow] = useState(() => new Date());

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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {prayerError}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!prayerData?.timings) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="text-center space-y-4 max-w-sm">
          <RefreshCw className="w-10 h-10 text-primary-500 animate-spin mx-auto" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Loading prayer times...
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isIftar = mode === 'iftar';
  const gradient = isIftar
    ? 'from-amber-950/40 via-primary-950/60 to-slate-950 dark:from-amber-950/30 dark:via-primary-950 dark:to-slate-950'
    : 'from-indigo-950/30 via-slate-900 to-slate-950 dark:from-indigo-950/20 dark:via-slate-950 dark:to-slate-950';

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-b ${gradient} transition-colors duration-500`}>
      <header className="flex items-center justify-between p-4 md:p-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-white/80 hover:text-white font-medium text-sm transition-colors min-h-[44px]"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div className="flex rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setMode('iftar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[40px] ${
              isIftar ? 'bg-primary-500 text-white shadow-lg' : 'text-white/70 hover:text-white'
            }`}
          >
            <Moon className="w-4 h-4" /> Iftar
          </button>
          <button
            type="button"
            onClick={() => setMode('sehri')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[40px] ${
              !isIftar ? 'bg-primary-500 text-white shadow-lg' : 'text-white/70 hover:text-white'
            }`}
          >
            <Sunrise className="w-4 h-4" /> Sehri
          </button>
        </div>
        <div className="w-16 md:w-20" aria-hidden />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <p className="text-white/60 text-sm font-bold uppercase tracking-[0.2em] mb-2">
          Countdown to {isIftar ? 'Iftar' : 'Sehri'}
        </p>
        {timeLabel && (
          <p className="text-white/50 text-xs font-medium mb-6">
            {isIftar ? 'Maghrib' : 'Fajr'} at {timeLabel}
          </p>
        )}

        {countdown.done ? (
          <div className="text-center">
            <p className="text-4xl md:text-5xl font-bold text-white mb-2">
              {isIftar ? "It's time for Iftar!" : "Sehri time has ended."}
            </p>
            <p className="text-white/70 text-sm">May your fast be accepted.</p>
          </div>
        ) : (
          <div className="flex gap-3 md:gap-6 font-mono">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                <span className="text-4xl md:text-6xl font-bold text-white tabular-nums">
                  {String(countdown.h).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest mt-2">Hours</span>
            </div>
            <div className="flex flex-col items-center pt-4">
              <span className="text-3xl md:text-5xl font-bold text-white/80">:</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                <span className="text-4xl md:text-6xl font-bold text-white tabular-nums">
                  {String(countdown.m).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest mt-2">Minutes</span>
            </div>
            <div className="flex flex-col items-center pt-4">
              <span className="text-3xl md:text-5xl font-bold text-white/80">:</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                <span className="text-4xl md:text-6xl font-bold text-white tabular-nums">
                  {String(countdown.s).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest mt-2">Seconds</span>
            </div>
          </div>
        )}

        {prayerData?.date?.hijri && (
          <p className="text-white/40 text-xs mt-8">
            {prayerData.date.hijri.day} {prayerData.date.hijri.month.en} {prayerData.date.hijri.year}
          </p>
        )}
      </main>
    </div>
  );
};

export default IftarTimer;
