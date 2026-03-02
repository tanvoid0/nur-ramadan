import React from 'react';
import { Utensils, BookOpen } from 'lucide-react';
import SignInToUnlock from './SignInToUnlock';

interface SignInGateProps {
  /** Section name, e.g. "Kitchen" or "Quran". */
  title: string;
  /** Short reason to sign in for this section. */
  reason: string;
  /** Icon to show (section-specific). */
  icon?: 'kitchen' | 'quran';
}

/**
 * Full-page gate shown when an anonymous user tries to access a sign-in–only section (e.g. Kitchen, Quran).
 */
const SignInGate: React.FC<SignInGateProps> = ({ title, reason, icon = 'kitchen' }) => {
  const Icon = icon === 'kitchen' ? Utensils : BookOpen;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-4">
      <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-primary-600 dark:text-primary-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sign in to use {title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">{reason}</p>
      <div className="w-full max-w-sm">
        <SignInToUnlock />
      </div>
    </div>
  );
};

export default SignInGate;
