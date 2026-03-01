import React from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export interface TimeParts {
  h: string;
  m: string;
  s: string;
  p: string;
  full: string;
}

const FlipUnit: React.FC<{ value: string; label?: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="flex gap-px" aria-hidden="true">
      {value.split('').map((char, i) => (
        <div key={i} className="relative w-5 h-6 sm:w-5 sm:h-7 bg-slate-900/90 dark:bg-black/80 rounded border border-white/10 flex items-center justify-center overflow-hidden shadow-lg backdrop-blur-sm">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/5 z-20" />
          <span className="text-white font-mono text-sm font-bold tracking-tighter leading-none z-10">{char}</span>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />
        </div>
      ))}
    </div>
    {label && <span className="text-[6px] font-black uppercase tracking-widest text-white/35">{label}</span>}
  </div>
);

export interface PageTitleBarProps {
  title: string;
  subtitle?: React.ReactNode;
  showClock?: boolean;
  clockStyle?: 'flip' | 'digital';
  timeParts?: TimeParts;
  trailing?: React.ReactNode;
  isRamadan?: boolean;
  actions?: React.ReactNode;
  compact?: boolean;
}

const PageTitleBar: React.FC<PageTitleBarProps> = ({
  title,
  subtitle,
  showClock = false,
  clockStyle = 'flip',
  timeParts,
  trailing,
  isRamadan = false,
  actions,
  compact = false,
}) => {
  const bgClass = isRamadan ? 'bg-primary-900 dark:bg-primary-950' : 'bg-slate-800 dark:bg-slate-900';

  return (
    <header
      className={`text-white rounded-b-2xl md:rounded-none shadow-lg transition-all relative overflow-hidden shrink-0 ${bgClass} ${
        compact ? 'px-4 py-3 md:px-5 md:py-4' : 'px-5 py-5 md:px-6 md:py-6'
      }`}
    >
      <div className="max-w-4xl mx-auto w-full relative z-10">
        <div className={`flex justify-between items-start ${compact ? 'items-center' : ''} ${compact ? 'gap-3' : 'mb-3'}`}>
          <div className="flex-1 min-w-0 pr-3">
            <h1 className={`font-serif font-semibold ${compact ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'}`}>{title}</h1>
            {((subtitle !== undefined && subtitle !== null) || (showClock && timeParts)) ? (
              <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
                {subtitle}
                {showClock && timeParts ? (
                  clockStyle === 'flip' ? (
                    <div className="flex items-end gap-1 px-1.5 py-0.5 bg-black/20 rounded-lg backdrop-blur-sm border border-white/5">
                      <FlipUnit value={timeParts.h} label="HR" />
                      <span className="text-white/25 font-bold text-[10px] pb-3 animate-pulse">:</span>
                      <FlipUnit value={timeParts.m} label="MIN" />
                      {compact ? null : (
                        <>
                          <span className="text-white/25 font-bold text-[10px] pb-3 animate-pulse">:</span>
                          <FlipUnit value={timeParts.s} label="SEC" />
                          <div className="pb-3 ml-0.5">
                            <span className="text-[7px] font-black bg-accent-400 text-slate-900 px-1 py-0.5 rounded">{timeParts.p}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                      <ClockIcon className="w-3.5 h-3.5 text-accent-400" />
                      <span className="text-white font-mono text-xs font-bold">{timeParts.full}</span>
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex gap-1.5 md:hidden shrink-0">{actions}</div> : null}
        </div>
        {!compact && trailing ? <div className="mt-5">{trailing}</div> : null}
      </div>
    </header>
  );
};

export default PageTitleBar;
