
import React, { useState } from 'react';
import { Moon, Star, ShieldCheck, Loader2 } from 'lucide-react';
import { User } from '../types';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleQuickSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin({
        id: 'google_user_' + Date.now(),
        name: 'Ramadan Traveler',
        email: 'traveler@ramadan.nur',
        photo: `https://ui-avatars.com/api/?name=Ramadan+Guest&background=059669&color=fff&size=128`
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4 md:p-8">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <Star className="absolute top-10 left-[10%] w-4 h-4 text-emerald-500/20 animate-pulse" />
         <Star className="absolute top-1/4 right-[15%] w-2 h-2 text-emerald-500/30 animate-pulse delay-700" />
         <Star className="absolute bottom-1/3 left-[20%] w-3 h-3 text-emerald-500/10 animate-pulse delay-300" />
         <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-800/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col items-center text-center">
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-[0_20px_40px_-10px_rgba(5,150,105,0.4)] relative group">
            <Moon className="w-12 h-12 text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)] group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/20" />
          </div>

          <div className="space-y-3 mb-12">
            <h1 className="text-4xl font-serif text-white tracking-tight">Nur Ramadan</h1>
            <p className="text-emerald-100/40 text-sm font-light leading-relaxed px-4">
              Step into a space of reflection, growth, and divine connection.
            </p>
          </div>

          <div className="w-full space-y-6">
            <button 
              onClick={handleQuickSignIn}
              disabled={loading}
              className="w-full bg-white text-slate-900 h-16 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all active:scale-[0.98] shadow-xl disabled:opacity-80"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-sm tracking-wide">Syncing Spiritual Data...</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                    <img src="https://www.google.com/favicon.ico" className="w-3.5 h-3.5" alt="Google" />
                  </div>
                  <span className="text-sm font-bold tracking-tight">Begin Journey with Google</span>
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-4">
               <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500/60 uppercase tracking-[0.3em]">
                 <ShieldCheck className="w-3.5 h-3.5" />
                 Encrypted Local Store
               </div>
               <div className="w-12 h-1 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>

        <p className="mt-8 text-emerald-100/20 text-[10px] text-center uppercase tracking-widest font-medium">
          Version 2.5 • Developed for Peace
        </p>
      </div>
    </div>
  );
};

export default AuthView;
