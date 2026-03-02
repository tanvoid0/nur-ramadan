import React from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Bell, Smartphone, Lock, Utensils, BookOpen } from 'lucide-react';

const BENEFITS = [
  { icon: Utensils, label: 'Kitchen — recipes & saved collection' },
  { icon: BookOpen, label: 'Quran — progress tracking' },
  { icon: Cloud, label: 'Sync across devices' },
  { icon: Bell, label: 'Prayer reminders' },
  { icon: Smartphone, label: 'Backup in the cloud' },
];

interface SignInToUnlockProps {
  /** When true, use compact layout (e.g. sidebar). When false, use expanded card (e.g. Settings). */
  compact?: boolean;
  /** Optional class for the container. */
  className?: string;
}

/**
 * Appealing "Sign in to unlock" CTA with benefit list. Use for anonymous users to encourage sign-in.
 */
const SignInToUnlock: React.FC<SignInToUnlockProps> = ({ compact = false, className = '' }) => {
  if (compact) {
    return (
      <div className={`flex flex-col gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <p className="text-xs font-bold text-white/90">Unlock more</p>
        </div>
        <ul className="space-y-1 text-[10px] text-white/60">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon className="w-3 h-3 text-primary-400/80 shrink-0" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/login"
          className="w-full py-2.5 rounded-lg bg-primary-500 hover:bg-primary-400 text-white text-center text-sm font-bold transition-colors shadow-md shadow-primary-900/30"
          data-tour="signin"
        >
          Sign in to unlock
        </Link>
      </div>
    );
  }

  return (
    <section className={`bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl overflow-hidden ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Unlock more with one account</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Sign in to get these features</p>
          </div>
        </div>
        <ul className="space-y-2 mb-4">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-primary-100 dark:border-primary-800">
                <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/login"
          className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-500 transition-colors shadow-sm"
        >
          Sign in to unlock these features
        </Link>
      </div>
    </section>
  );
};

export default SignInToUnlock;
