import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Moon, Star, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const IS_DEV = import.meta.env.MODE !== 'production';

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthViewProps {
  /** Called with user and, when available, the Google ID token for backend API auth (stored in sessionStorage; never log or expose). */
  onLogin: (user: User, idToken?: string) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    setError(null);
    setLoading(true);
    try {
      const credential = credentialResponse.credential;
      if (!credential) {
        setError('No credential received from Google.');
        setLoading(false);
        return;
      }
      const decoded = jwtDecode<GoogleJwtPayload>(credential);
      const user: User = {
        id: decoded.sub,
        name: decoded.name ?? decoded.email.split('@')[0],
        email: decoded.email,
        photo: decoded.picture,
      };
      onLogin(user, credential);
    } catch (e) {
      console.error('Google sign-in decode failed', e);
      setError('Could not sign you in. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary-950 flex items-center justify-center p-4 md:p-8">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <Star className="absolute top-10 left-[10%] w-4 h-4 text-primary-500/20 animate-pulse" />
        <Star className="absolute top-1/4 right-[15%] w-2 h-2 text-primary-500/30 animate-pulse delay-700" />
        <Star className="absolute bottom-1/3 left-[20%] w-3 h-3 text-primary-500/10 animate-pulse delay-300" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-800/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] relative group">
            <Moon className="w-12 h-12 text-accent-400 fill-accent-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/20" />
          </div>

          <div className="space-y-3 mb-12">
            <h1 className="text-4xl font-serif text-white tracking-tight">Nur Ramadan</h1>
            <p className="text-primary-100/40 text-sm font-light leading-relaxed px-4">
              Step into a space of reflection, growth, and divine connection.
            </p>
            <div className="mt-2 text-[10px] text-primary-100/60 leading-relaxed px-6">
              <p className="font-semibold uppercase tracking-[0.22em] text-primary-200/70 mb-1">
                Anonymous Mode • Titanium-grade privacy
              </p>
              <p className="mb-1">
                Use Nur Ramadan without an account at any time. In Anonymous Mode:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-primary-100/70">
                <li>We don&apos;t ask for your name, email, or phone number to start.</li>
                <li>Your fasting and habit data are stored on this device, not on our servers.</li>
                <li>Location, if enabled, is used only to calculate local prayer and fasting times.</li>
              </ul>
            </div>
          </div>

          <div className="w-full space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {GOOGLE_CLIENT_ID ? (
              <div className="flex flex-col items-center [&_.abcRioButton]:!w-full [&_.abcRioButton]:!h-16 [&_.abcRioButton]:!rounded-[1rem] [&_.abcRioButton]:!shadow-xl">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="filled_black"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="320"
                />
                {loading && (
                  <div className="mt-3 flex items-center gap-2 text-primary-200 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing spiritual data...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-100 text-xs text-left space-y-2">
                <p className="font-semibold">Google Sign-In is not configured.</p>
                <p>Set <code className="bg-black/20 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in your <code className="bg-black/20 px-1 rounded">.env</code> and create OAuth credentials in Google Cloud Console. Add your app URL to Authorized JavaScript origins.</p>
              </div>
            )}
            {GOOGLE_CLIENT_ID && IS_DEV && (
              <p className="text-primary-300/60 text-[10px] text-center">If the Google button doesn&apos;t load, add <code className="bg-black/20 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your origin'}</code> to Authorized JavaScript origins in Google Cloud Console and try disabling ad blockers.</p>
            )}

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-[9px] font-bold text-primary-500/60 uppercase tracking-[0.3em]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Encrypted Local Store
              </div>
              <div className="w-12 h-1 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>

        <p className="mt-8 text-primary-100/20 text-[10px] text-center uppercase tracking-widest font-medium">
          Version 2.5 • Developed for Peace
        </p>
      </div>
    </div>
  );
};

export default AuthView;
