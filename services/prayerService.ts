
export interface PrayerData {
  timings: { [key: string]: string };
  date: {
    hijri: {
      day: string;
      month: { 
        en: string; 
        ar: string;
        number: number;
      };
      year: string;
      designation: { abbreviated: string };
    };
    gregorian: { date: string; format: string; day: string; };
  };
  meta: {
    timezone: string;
    method: { name: string };
  };
}

export const fetchPrayerTimes = async (lat: number, lng: number, date?: Date): Promise<PrayerData> => {
  const timestamp = date ? Math.floor(date.getTime() / 1000) : Math.floor(Date.now() / 1000);
  const response = await fetch(
    `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=2`
  );
  if (!response.ok) throw new Error("Failed to fetch prayer times");
  const json = await response.json();
  return json.data;
};

export const getCityName = async (lat: number, lng: number): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    const data = await response.json();
    if (data.address) {
      const city = data.address.city || data.address.town || data.address.village || data.address.state || "Known Zone";
      const country = data.address.country || "";
      return country ? `${city}, ${country}` : city;
    }
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch (error) {
    console.warn("Geocoding failed, using coordinates as fallback", error);
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
};

export const findCoordsByCity = async (city: string): Promise<{lat: number, lng: number, name: string} | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return { 
        lat: parseFloat(data[0].lat), 
        lng: parseFloat(data[0].lon),
        name: data[0].display_name.split(',').slice(0, 2).join(', ')
      };
    }
    return null;
  } catch {
    return null;
  }
};
