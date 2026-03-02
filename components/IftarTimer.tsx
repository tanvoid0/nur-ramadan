import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sunrise, RefreshCw, MapPin, Pencil, Sun } from 'lucide-react';
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
  const [now, setNow] = useState(() => new Date());
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const { primary, secondary } = useMemo(() => {
    if (!prayerData?.timings) {
      return { primary: null as null | { type: TimerMode; target: Date; label: string; prayerName: string }, secondary: null as null | { type: TimerMode; target: Date; label: string; prayerName: string } };
    }
    const timings = prayerData.timings;

    const events: { type: TimerMode; target: Date; label: string; prayerName: string }[] = [];

    const maghribStr = timings.Maghrib;
    if (maghribStr) {
      let targetDate = parseTimeToDate(maghribStr, new Date());
      if (targetDate <= now) {
        targetDate = new Date(targetDate);
        targetDate.setDate(targetDate.getDate() + 1);
      }
      events.push({ type: 'iftar', target: targetDate, label: 'Iftar', prayerName: 'Maghrib' });
    }

    const fajrStr = timings.Fajr;
    if (fajrStr) {
      let targetDate = parseTimeToDate(fajrStr, new Date());
      if (targetDate <= now) {
        targetDate = new Date(targetDate);
        targetDate.setDate(targetDate.getDate() + 1);
      }
      events.push({ type: 'sehri', target: targetDate, label: 'Sehri Ends', prayerName: 'Fajr' });
    }

    events.sort((a, b) => a.target.getTime() - b.target.getTime());

    return {
      primary: events[0] || null,
      secondary: events[1] || null,
    };
  }, [prayerData, now]);

  const target = primary?.target ?? null;

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

  const skyProgress = useMemo(() => {
    if (!target) return 0;
    const totalWindowMs = 6 * 60 * 60 * 1000;
    const diff = target.getTime() - now.getTime();
    const clamped = Math.min(totalWindowMs, Math.max(0, diff));
    return 1 - clamped / totalWindowMs;
  }, [target, now]);

  const timeLabel = primary ? prayerData?.timings?.[primary.prayerName as 'Maghrib' | 'Fajr'] : undefined;

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

  const isIftar = primary?.type === 'iftar';

  const hours = now.getHours() + now.getMinutes() / 60;
  const isDayPhase = hours >= 5.5 && hours < 18.5;

  const bgBase = isDayPhase ? 'bg-primary-700' : 'bg-primary-950';
  const headerLink = isDayPhase ? 'text-slate-100 hover:text-white' : 'text-white/80 hover:text-white';
  const tabBar = 'bg-white/10 border-white/10';
  const tabInactive = isDayPhase ? 'text-slate-100/80 hover:text-white' : 'text-white/70 hover:text-white';
  const locationChip = 'bg-white/10 border-white/15 hover:bg-white/15 text-white/80 hover:text-white';
  const countdownTitle = isDayPhase ? 'text-primary-50' : 'text-primary-100';
  const timeSubtext = isDayPhase ? 'text-slate-100/80' : 'text-white/50';
  const doneTitle = 'text-white';
  const doneSub = 'text-primary-100/90';
  const cardBg = isDayPhase ? 'bg-white/90 border-primary-200' : 'bg-white/10 border-primary-500/30';
  const cardText = isDayPhase ? 'text-slate-900' : 'text-white';
  const cardLabel = isDayPhase ? 'text-primary-700' : 'text-primary-100/80';
  const colon = isDayPhase ? 'text-primary-100' : 'text-primary-200/80';
  const hijriDate = isDayPhase ? 'text-primary-50/90' : 'text-primary-100/70';

  return (
    <div className={`min-h-screen flex flex-col relative ${bgBase} transition-colors duration-300`}>
        {/* Subtle background sky – shapes, clouds, sun & moon */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary-800/25 transition-opacity duration-300" />
        <div className="absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-primary-900/40 transition-opacity duration-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-slate-950/20 transition-opacity duration-300" />

        {/* Moving clouds across full background – subtle motion, SVG shapes */}
        {(() => {
          const t = now.getTime() / 1000; // seconds

          // Approximate sun/moon positions for cloud–cover glow
          const pathT = primary ? (isIftar ? skyProgress : 1 - skyProgress) : 0;
          const sunPathOpacity = primary
            ? Math.max(0, Math.min(1, isIftar ? 1 - skyProgress : skyProgress))
            : 0;
          const moonPathOpacity = primary ? 1 - sunPathOpacity : 0;
          const sunXPos = 5 + pathT * 70;
          const moonXPos = 5 + (1 - pathT) * 70;
          const sunYPos = isDayPhase ? 20 : 24;
          const moonYPos = isDayPhase ? 30 : 22;

          const clouds = [
            {
              baseTop: 18,
              baseScale: 1.05,
              speed: 0.003,
              phase: 0,
              wobbleAmp: 1.2,
              wobbleFreq: 0.18,
              opacityDay: 0.9,
              opacityNight: 0.55,
            },
            {
              baseTop: 24,
              baseScale: 0.95,
              speed: -0.004,
              phase: 1.7,
              wobbleAmp: 0.9,
              wobbleFreq: 0.22,
              opacityDay: 0.85,
              opacityNight: 0.5,
            },
            {
              baseTop: 14,
              baseScale: 0.85,
              speed: 0.005,
              phase: 3.2,
              wobbleAmp: 1.1,
              wobbleFreq: 0.25,
              opacityDay: 0.8,
              opacityNight: 0.45,
            },
            {
              baseTop: 30,
              baseScale: 0.8,
              speed: -0.006,
              phase: 4.9,
              wobbleAmp: 0.9,
              wobbleFreq: 0.2,
              opacityDay: 0.78,
              opacityNight: 0.4,
            },
            // Extra softer, background clouds
            {
              baseTop: 12,
              baseScale: 0.8,
              speed: 0.002,
              phase: 2.4,
              wobbleAmp: 0.6,
              wobbleFreq: 0.16,
              opacityDay: 0.7,
              opacityNight: 0.45,
            },
            {
              baseTop: 28,
              baseScale: 0.65,
              speed: -0.003,
              phase: 3.9,
              wobbleAmp: 0.7,
              wobbleFreq: 0.2,
              opacityDay: 0.7,
              opacityNight: 0.45,
            },
            {
              baseTop: 20,
              baseScale: 1.1,
              speed: 0.0025,
              phase: 5.3,
              wobbleAmp: 0.9,
              wobbleFreq: 0.18,
              opacityDay: 0.85,
              opacityNight: 0.55,
            },
            {
              baseTop: 34,
              baseScale: 0.9,
              speed: -0.0035,
              phase: 0.9,
              wobbleAmp: 0.8,
              wobbleFreq: 0.21,
              opacityDay: 0.8,
              opacityNight: 0.5,
            },
          ] as const;

          const loopWidth = 120; // percent width to travel before looping

          return clouds.map((cloud, index) => {
            const x = ((t * cloud.speed * 120 + cloud.phase * 47) % loopWidth) - 10;
            const yOffset = Math.sin(t * cloud.wobbleFreq + cloud.phase) * cloud.wobbleAmp;
            const cloudY = cloud.baseTop + yOffset;
            const baseOpacity = isDayPhase ? cloud.opacityDay : cloud.opacityNight;
            let opacity = Math.min(1, baseOpacity * (isDayPhase ? 1 : 1.25));

            // Detect when a cloud is covering the sun or moon to add a soft glow
            const coverRadius = 12;
            const distToSun = Math.hypot(x - sunXPos, cloudY - sunYPos);
            const distToMoon = Math.hypot(x - moonXPos, cloudY - moonYPos);
            const coveringSun = sunPathOpacity > 0.25 && distToSun < coverRadius;
            const coveringMoon = moonPathOpacity > 0.25 && distToMoon < coverRadius;

            if (coveringSun || coveringMoon) {
              opacity = Math.min(1, opacity + 0.2);
            }
            const scale =
              cloud.baseScale *
              (0.97 +
                0.03 *
                  Math.sin(t * (0.18 + 0.06 * index) + cloud.phase * 0.5));

            return (
              <svg
                key={index}
                viewBox="0 0 160 80"
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${cloudY}%`,
                  width: '30vw',
                  height: '15vw',
                  maxWidth: 320,
                  maxHeight: 150,
                  minWidth: 140,
                  minHeight: 60,
                  opacity,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  filter:
                    (isDayPhase ? 'blur(3px)' : 'blur(5px)') +
                    (coveringSun
                      ? ' drop-shadow(0 0 24px rgba(250, 204, 21, 0.75))'
                      : coveringMoon
                      ? ' drop-shadow(0 0 22px rgba(226, 232, 240, 0.8))'
                      : ''),
                  transition: 'opacity 400ms ease-out',
                  pointerEvents: 'none',
                }}
              >
                <g
                  fill={isDayPhase ? 'rgba(248,250,252,0.95)' : 'rgba(226,232,240,0.9)'}
                >
                  {/* Central puff */}
                  <ellipse cx="70" cy="40" rx="34" ry="20" />
                  {/* Left puff */}
                  <ellipse cx="40" cy="42" rx="24" ry="16" />
                  {/* Right puff */}
                  <ellipse cx="100" cy="42" rx="26" ry="16" />
                  {/* Small top puffs for more cloud-like silhouette */}
                  <ellipse cx="55" cy="28" rx="16" ry="12" />
                  <ellipse cx="85" cy="26" rx="18" ry="13" />
                </g>
              </svg>
            );
          });
        })()}

        {/* Sun & Moon floating in background sky – subtle, mostly horizontal motion */}
        {primary && (
          (() => {
            const t = now.getTime() / 1000;
            const pathT = isIftar ? skyProgress : 1 - skyProgress; // 0 → 1 across path
            const sunOpacity = Math.max(0, Math.min(1, isIftar ? 1 - skyProgress : skyProgress));
            const moonOpacity = 1 - sunOpacity;

            // Horizontal positions: 5% → 75% across the sky
            const sunX = 5 + pathT * 70;
            const moonX = 5 + (1 - pathT) * 70;

            // Fixed vertical bands, with very gentle breathing
            const sunBaseY = isDayPhase ? 20 : 24;
            const moonBaseY = isDayPhase ? 30 : 22;
            const verticalBreath = Math.sin(t * 0.12) * 0.8; // < 1% viewport shift

            return (
              <>
                {/* Sun with soft radial glow */}
                <div
                  className="absolute"
                  style={{
                    left: `${sunX}%`,
                    top: `${sunBaseY + verticalBreath}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: sunOpacity,
                  }}
                >
                  <div
                    className="absolute -inset-6 rounded-full pointer-events-none"
                    style={{
                      background: isDayPhase
                        ? 'radial-gradient(circle at 50% 50%, rgba(250, 250, 210, 0.9), rgba(251, 191, 36, 0.0))'
                        : 'radial-gradient(circle at 50% 50%, rgba(226, 232, 240, 0.85), rgba(226, 232, 240, 0.0))',
                      filter: 'blur(4px)',
                    }}
                  />
                  <div
                    className="relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl overflow-hidden"
                    style={{
                      background: 'transparent',
                      boxShadow: isDayPhase
                        ? '0 0 55px rgba(250, 204, 21, 0.95)'
                        : '0 0 44px rgba(248, 250, 252, 0.9)',
                    }}
                  >
                    <img
                      src="/images/sun.svg"
                      alt="Sun"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Moon with halo and subtle tail glow */}
                <div
                  className="absolute"
                  style={{
                    left: `${moonX}%`,
                    top: `${moonBaseY + verticalBreath}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: Math.max(0, Math.min(1, moonOpacity * (isDayPhase ? 0.6 : 1))),
                  }}
                >
                  <div
                    className="absolute -inset-6 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(226, 232, 240, 0.8), rgba(15, 23, 42, 0.0))',
                      filter: 'blur(5px)',
                    }}
                  />
                  <div
                    className="relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-2xl overflow-hidden"
                    style={{
                      background: 'transparent',
                      boxShadow: '0 0 48px rgba(148, 163, 184, 0.9)',
                    }}
                  >
                    <img
                      src="/images/moon.svg"
                      alt="Moon"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </>
            );
          })()
        )}

        {/* City & mosque skyline along the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-40 md:h-48">
          {/* Hazy glow behind skyline */}
          <div
            className="absolute inset-x-[-10%] bottom-10 h-24 md:h-28 bg-gradient-to-t from-black/70 via-black/40 to-transparent blur-3xl opacity-80"
            style={{
              mixBlendMode: isDayPhase ? 'multiply' : 'screen',
            }}
          />

          {/* Layered silhouettes */}
          <svg
            viewBox="0 0 1440 320"
            className="absolute inset-x-0 bottom-0 w-full h-full text-slate-950/95"
            preserveAspectRatio="none"
          >
            {/* Back row - distant city / minarets */}
            <path
              d="M0 240 L60 240 L60 180 L90 180 L90 120 L110 120 L110 180 L140 180 L140 210 L200 210 L200 150 L220 150 L220 110 L240 110 L240 150 L270 150 L270 220 L340 220 L340 170 L360 170 L360 140 L380 140 L380 170 L420 170 L420 210 L480 210 L480 150 L510 150 L510 100 L530 100 L530 150 L560 150 L560 230 L620 230 L620 180 L650 180 L650 130 L670 130 L670 180 L710 180 L710 220 L780 220 L780 140 L800 140 L800 90 L820 90 L820 140 L850 140 L850 210 L920 210 L920 170 L950 170 L950 120 L970 120 L970 170 L1010 170 L1010 220 L1080 220 L1080 160 L1110 160 L1110 120 L1130 120 L1130 160 L1170 160 L1170 210 L1240 210 L1240 180 L1280 180 L1280 140 L1300 140 L1300 180 L1360 180 L1360 240 L1440 240 L1440 320 L0 320 Z"
              fill={isDayPhase ? 'rgba(15,23,42,0.9)' : 'rgba(15,23,42,1)'}
            />

            {/* Middle row - mosques and domes */}
            <path
              d="M0 260 L120 260 Q140 210 170 210 Q200 210 220 260 L260 260 L260 200 Q260 170 285 150 Q310 130 335 150 Q360 170 360 200 L360 260 L420 260 L420 190 Q420 160 450 140 Q480 120 510 140 Q540 160 540 190 L540 260 L620 260 L620 210 Q620 180 650 160 Q680 140 710 160 Q740 180 740 210 L740 260 L820 260 L820 200 Q820 170 850 150 Q880 130 910 150 Q940 170 940 200 L940 260 L1020 260 L1020 210 Q1020 180 1050 160 Q1080 140 1110 160 Q1140 180 1140 210 L1140 260 L1240 260 Q1260 220 1290 220 Q1320 220 1340 260 L1440 260 L1440 320 L0 320 Z"
              fill={isDayPhase ? 'rgba(12,20,38,0.95)' : 'rgba(15,23,42,1)'}
            />

            {/* Front row - walls & trees */}
            <path
              d="M0 280 L80 280 L80 260 L120 260 L120 280 L220 280 L220 250 L260 250 L260 280 L360 280 L360 255 L400 255 L400 280 L520 280 L520 250 L560 250 L560 280 L680 280 L680 255 L720 255 L720 280 L840 280 L840 250 L880 250 L880 280 L1000 280 L1000 255 L1040 255 L1040 280 L1160 280 L1160 250 L1200 250 L1200 280 L1320 280 L1320 260 L1360 260 L1360 280 L1440 280 L1440 320 L0 320 Z"
              fill={isDayPhase ? 'rgba(8,16,32,0.98)' : 'rgba(15,23,42,1)'}
            />

            {/* Simple palm trees / minarets in front */}
            <g
              stroke="rgba(15,23,42,1)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            >
              {/* Palms */}
              <g>
                <line x1="180" y1="260" x2="180" y2="225" />
                <path d="M168 228 Q180 220 192 228" />
                <path d="M170 233 Q180 225 190 233" />
              </g>
              <g>
                <line x1="520" y1="270" x2="520" y2="235" />
                <path d="M508 238 Q520 230 532 238" />
                <path d="M510 243 Q520 235 530 243" />
              </g>
              <g>
                <line x1="980" y1="270" x2="980" y2="235" />
                <path d="M968 238 Q980 230 992 238" />
                <path d="M970 243 Q980 235 990 243" />
              </g>

              {/* Simple foreground minarets */}
              <g>
                <line x1="300" y1="270" x2="300" y2="220" />
                <path d="M294 220 Q300 210 306 220" />
              </g>
              <g>
                <line x1="760" y1="275" x2="760" y2="225" />
                <path d="M754 225 Q760 215 766 225" />
              </g>
              <g>
                <line x1="1220" y1="270" x2="1220" y2="220" />
                <path d="M1214 220 Q1220 210 1226 220" />
              </g>
            </g>
          </svg>
        </div>
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
        <div className={`rounded-2xl backdrop-blur-sm border px-4 py-2 flex flex-col items-end ${tabBar}`}>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
            Next
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isIftar ? (
              <Moon className="w-4 h-4 text-accent-300" />
            ) : (
              <Sunrise className="w-4 h-4 text-amber-300" />
            )}
            <span className="text-xs font-semibold text-white">
              {primary?.label ?? 'Ramadan Timer'}
            </span>
          </div>
        </div>
        <div className="w-4 md:w-6" aria-hidden />
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
          Countdown to {primary?.label ?? 'Next Milestone'}
        </p>
        {timeLabel && (
          <p className={`${timeSubtext} text-xs font-medium mb-6`}>
            {isIftar ? 'Maghrib' : 'Fajr'} at {timeLabel}
          </p>
        )}

        {countdown.done || !primary ? (
          <div className="text-center">
            <p className={`text-4xl md:text-5xl font-bold mb-2 ${doneTitle}`}>
              All caught up for now.
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

        {secondary && (
          <div className="mt-8 flex flex-col items-center gap-1 text-xs text-primary-50/80">
            <span className="uppercase tracking-[0.22em] text-[9px] font-semibold text-primary-100/70">
              Then
            </span>
            <div className="flex items-center gap-2 bg-black/10 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
              {secondary.type === 'iftar' ? (
                <Moon className="w-3.5 h-3.5 text-accent-200" />
              ) : (
                <Sunrise className="w-3.5 h-3.5 text-amber-200" />
              )}
              <span className="font-semibold text-[11px] text-white">
                {secondary.label}
              </span>
              <span className="text-[10px] text-primary-100/80">
                in{' '}
                {(() => {
                  const diff = secondary.target.getTime() - now.getTime();
                  const h = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
                  const m = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
                  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                })()}
              </span>
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
