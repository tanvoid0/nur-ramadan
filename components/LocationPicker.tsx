import React, { useState } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import type { User } from '../types';
import { findCoordsByCity } from '../services/prayerService';

interface LocationPickerProps {
  user: User | null;
  resolvedLocationName: string;
  onUpdateUser: (u: User) => void;
  onDetectLocation: () => void;
  /** When true, show compact layout (e.g. inside modal). */
  compact?: boolean;
}

/**
 * Reusable location picker: clear separation between "Use my location (GPS)" and "Choose a city (manual)" to avoid confusion.
 */
const LocationPicker: React.FC<LocationPickerProps> = ({
  user,
  resolvedLocationName,
  onUpdateUser,
  onDetectLocation,
  compact = false,
}) => {
  const [cityInput, setCityInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);

  const isUsingGPS = !user?.manualCoords;
  const isDetecting = resolvedLocationName.includes('Detecting');

  const handleUseMyLocation = () => {
    if (!user) return;
    setGpsLoading(true);
    onUpdateUser({ ...user, manualCoords: undefined, manualCity: undefined });
    onDetectLocation();
    setShowManualSearch(false);
    setSearchError(null);
    setTimeout(() => setGpsLoading(false), 1500);
  };

  const handleCitySearch = async () => {
    if (!cityInput.trim() || !user) return;
    setSearchLoading(true);
    setSearchError(null);
    const result = await findCoordsByCity(cityInput.trim());
    if (result) {
      onUpdateUser({
        ...user,
        manualCoords: { lat: result.lat, lng: result.lng },
        manualCity: result.name,
      });
      setCityInput(result.name);
      setShowManualSearch(false);
    } else {
      setSearchError('City not found. Try another name.');
    }
    setSearchLoading(false);
  };

  const handleChooseCityInstead = () => {
    setShowManualSearch(true);
    setSearchError(null);
    if (user?.manualCity) setCityInput(user.manualCity);
  };

  const padding = compact ? 'p-3' : 'p-4';
  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={`space-y-4 ${padding}`}>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
        Location is used only for prayer times. Stored on your device only.
      </p>

      {/* Current location summary */}
      <div className={`rounded-xl border p-3 ${isUsingGPS ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-center gap-2 mb-1">
          {isUsingGPS ? (
            <Navigation className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
          ) : (
            <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isUsingGPS ? 'Using your device location' : 'Using chosen city'}
          </span>
        </div>
        <p className={`font-bold text-slate-800 dark:text-slate-100 ${compact ? 'text-sm' : 'text-base'}`}>
          {resolvedLocationName || 'Unknown'}
        </p>
        {(resolvedLocationName === 'LOCATION DENIED' || resolvedLocationName === 'TIMEOUT - TRY AGAIN') && isUsingGPS && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
            Allow location in browser or choose a city below.
          </p>
        )}
      </div>

      {/* Option 1: Use my location (GPS) */}
      <div className={`rounded-xl border p-3 transition-colors ${isUsingGPS ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Navigation className={`w-4 h-4 shrink-0 ${isUsingGPS ? 'text-primary-600' : 'text-slate-400'}`} />
            <div>
              <p className={`font-bold ${textSize} text-slate-800 dark:text-slate-100`}>Use my location</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">GPS for accurate local prayer times</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={gpsLoading || isDetecting}
            className={`shrink-0 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${isUsingGPS ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
          >
            {gpsLoading || isDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            {isUsingGPS ? (isDetecting ? 'Detecting…' : 'Refresh') : 'Use my location'}
          </button>
        </div>
      </div>

      {/* Option 2: Choose a city (manual) */}
      <div className={`rounded-xl border p-3 transition-colors ${!isUsingGPS ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 shrink-0 ${!isUsingGPS ? 'text-primary-600' : 'text-slate-400'}`} />
            <div>
              <p className={`font-bold ${textSize} text-slate-800 dark:text-slate-100`}>Choose a city</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Search if you want a fixed city</p>
            </div>
          </div>
          {!showManualSearch && (
            <button
              type="button"
              onClick={handleChooseCityInstead}
              className="shrink-0 py-2 px-3 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Choose city
            </button>
          )}
        </div>

        {(showManualSearch || !isUsingGPS) && (
          <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => { setCityInput(e.target.value); setSearchError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
                placeholder="Search city..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 pl-3 pr-10 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={handleCitySearch}
                disabled={searchLoading || !cityInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-500 disabled:opacity-50 transition-colors"
              >
                {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>
            {searchError && <p className="text-xs text-amber-600 dark:text-amber-400">{searchError}</p>}
            {!isUsingGPS && (
              <button
                type="button"
                onClick={() => setShowManualSearch(false)}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Hide search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPicker;
