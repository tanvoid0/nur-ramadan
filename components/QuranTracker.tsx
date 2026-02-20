
import React, { useState } from 'react';
import { Bookmark, ChevronRight, ChevronLeft, BookOpen, Target, TrendingUp, Zap, Edit3 } from 'lucide-react';
import { QuranProgress } from '../types';

interface QuranTrackerProps {
  progress: QuranProgress;
  setProgress: React.Dispatch<React.SetStateAction<QuranProgress>>;
}

const QuranTracker: React.FC<QuranTrackerProps> = ({ progress, setProgress }) => {
  const TOTAL_PAGES = 604;
  const percentage = Math.min(100, Math.round((progress.pagesRead / TOTAL_PAGES) * 100));
  const pagesRemaining = TOTAL_PAGES - progress.pagesRead;
  const recommendedPace = Math.ceil(pagesRemaining / 25); // Estimated days left

  const updateProgress = (updates: Partial<QuranProgress>) => setProgress(prev => ({ ...prev, ...updates }));

  const addPage = () => progress.pagesRead < TOTAL_PAGES && updateProgress({ pagesRead: progress.pagesRead + 1 });
  const removePage = () => progress.pagesRead > 0 && updateProgress({ pagesRead: progress.pagesRead - 1 });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Quran Journey</h2>
        <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
          <Zap className="w-3 h-3" /> Sync Active
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-900/60 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800 transition-colors">
        <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><BookOpen className="w-40 h-40" /></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div><p className="text-primary-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Current Progress</p><h3 className="text-4xl font-serif">{percentage}% <span className="text-sm font-sans font-normal text-slate-400">Complete</span></h3></div>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/5"><Bookmark className="w-6 h-6 text-primary-400" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[{l: 'Pages', v: progress.pagesRead}, {l: 'Juz', v: progress.juz}, {l: 'Surah', v: progress.surah}].map((x, i) => (
              <div key={i} className="text-center bg-white/5 p-4 rounded-3xl border border-white/5"><p className="text-slate-400 text-[9px] font-bold uppercase mb-1">{x.l}</p><p className="text-xl font-bold">{x.v}</p></div>
            ))}
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-8"><div className="h-full bg-gradient-to-r from-primary-500 to-teal-400 transition-all duration-1000" style={{ width: `${percentage}%` }} /></div>
          <div className="flex gap-3">
            <button onClick={removePage} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={addPage} className="flex-1 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">Log Page Completed</button>
            <button onClick={addPage} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><h4 className="font-bold text-slate-800 dark:text-slate-100">Khatam Planner</h4></div></div>
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-4">
          <div className="bg-indigo-600 dark:bg-indigo-800 p-3 rounded-xl text-white"><TrendingUp className="w-5 h-5" /></div>
          <div><p className="text-xs text-indigo-900 dark:text-indigo-200 font-bold mb-1">Required Pace</p><p className="text-sm text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">Read <span className="text-indigo-950 dark:text-indigo-100 font-black">{recommendedPace} pages</span> daily to finish by Eid.</p></div>
        </div>
      </section>
    </div>
  );
};

export default QuranTracker;
