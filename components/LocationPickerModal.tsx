import React from 'react';
import { X, MapPin } from 'lucide-react';
import type { User } from '../types';
import LocationPicker from './LocationPicker';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  resolvedLocationName: string;
  onUpdateUser: (u: User) => void;
  onDetectLocation: () => void;
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  user,
  resolvedLocationName,
  onUpdateUser,
  onDetectLocation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700"
        role="dialog"
        aria-labelledby="location-modal-title"
        aria-modal="true"
      >
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 id="location-modal-title" className="font-bold text-slate-800 dark:text-slate-100">
              Prayer times location
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <LocationPicker
            user={user}
            resolvedLocationName={resolvedLocationName}
            onUpdateUser={onUpdateUser}
            onDetectLocation={onDetectLocation}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
