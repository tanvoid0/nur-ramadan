import React, { useState, useEffect, useCallback } from 'react';

const TUTORIAL_DONE_KEY = 'nur_tutorial_done';

interface Step {
  id: string;
  target: string;
  title: string;
  body: string;
}

const DEFAULT_STEPS: Step[] = [
  { id: 'home', target: 'home', title: 'Home', body: 'Your dashboard and daily overview.' },
  { id: 'timer', target: 'timer', title: 'Iftar Timer', body: 'Tap here for the Iftar countdown.' },
  { id: 'habits', target: 'habits', title: 'Routine', body: 'Track daily habits and prayers.' },
  { id: 'quran', target: 'quran', title: 'Quran', body: 'Track your Quran reading progress.' },
  { id: 'kitchen', target: 'kitchen', title: 'Kitchen', body: 'Sehri & Iftar recipe ideas.' },
  { id: 'settings', target: 'settings', title: 'Settings', body: 'Theme, location, and notifications.' },
];

function getVisibleTarget(targetId: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${targetId}"]`);
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

interface OnboardingTourProps {
  /** When true, add a final step for Sign in (for anonymous users). */
  showSignInStep?: boolean;
}

const CARD_GAP = 12;
const CARD_WIDTH = 320;
const CARD_MIN_EDGE = 16;

const OnboardingTour: React.FC<OnboardingTourProps> = ({ showSignInStep = false }) => {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number } | null>(null);

  const steps = showSignInStep
    ? [...DEFAULT_STEPS, { id: 'signin', target: 'signin', title: 'Unlock more', body: 'Sign in to use Kitchen & Quran, sync across devices, prayer reminders, and cloud backup.' }]
    : DEFAULT_STEPS;

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
    setStepIndex(0);
    setCardPosition(null);
  }, []);

  const updateCardPosition = useCallback(() => {
    if (!currentStep) return;
    const el = getVisibleTarget(currentStep.target);
    if (!el) {
      setCardPosition(null);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Prefer placing card to the right of the target (sidebar) or below (bottom nav)
    const cardH = 220;
    const rightSpace = viewportW - (rect.right + CARD_GAP);
    const belowSpace = viewportH - (rect.bottom + CARD_GAP);
    const aboveSpace = rect.top - CARD_GAP;

    let top: number;
    let left: number;

    if (rect.left > viewportW * 0.4) {
      // Target is on the left (sidebar): put card to the right of target
      left = Math.max(CARD_MIN_EDGE, Math.min(rect.right + CARD_GAP, viewportW - CARD_WIDTH - CARD_MIN_EDGE));
      top = Math.max(CARD_MIN_EDGE, Math.min(rect.top, viewportH - cardH - CARD_MIN_EDGE));
    } else {
      // Target is bottom nav or center: put card above or below target
      if (belowSpace >= cardH || belowSpace >= aboveSpace) {
        top = rect.bottom + CARD_GAP;
      } else {
        top = rect.top - cardH - CARD_GAP;
      }
      left = Math.max(CARD_MIN_EDGE, Math.min(rect.left + rect.width / 2 - CARD_WIDTH / 2, viewportW - CARD_WIDTH - CARD_MIN_EDGE));
    }

    setCardPosition({ top, left });
  }, [currentStep]);

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_DONE_KEY);
    if (done) return;
    const t = setTimeout(() => {
      setVisible(true);
      setStepIndex(0);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const show = () => {
      try {
        localStorage.removeItem(TUTORIAL_DONE_KEY);
      } catch {
        // ignore
      }
      setStepIndex(0);
      setVisible(true);
    };
    window.addEventListener('nur-show-tour', show);
    return () => window.removeEventListener('nur-show-tour', show);
  }, []);

  useEffect(() => {
    if (!visible || !currentStep) return;
    const raf = requestAnimationFrame(updateCardPosition);
    const timeout = setTimeout(updateCardPosition, 400);
    window.addEventListener('resize', updateCardPosition);
    window.addEventListener('scroll', updateCardPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      window.removeEventListener('resize', updateCardPosition);
      window.removeEventListener('scroll', updateCardPosition, true);
    };
  }, [visible, stepIndex, currentStep, updateCardPosition]);

  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };

  if (!visible || !currentStep) return null;

  const position = cardPosition ?? { top: window.innerHeight / 2 - 110, left: Math.max(CARD_MIN_EDGE, (window.innerWidth - CARD_WIDTH) / 2) };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" aria-hidden />

      {/* Card - positioned near target */}
      <div
        className="absolute w-[min(calc(100vw-2rem),320px)] max-w-sm pointer-events-auto transition-all duration-200"
        style={{ top: position.top, left: position.left }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">{currentStep.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{currentStep.body}</p>
          <div className="flex justify-between items-center gap-3">
            <button
              type="button"
              onClick={finish}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Skip tour
            </button>
            <button
              type="button"
              onClick={goNext}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-500 transition-colors"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            {stepIndex + 1} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
