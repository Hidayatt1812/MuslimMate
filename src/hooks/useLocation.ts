import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { getSettings, updateSettings } from '@/services/storageService';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cached location first
      const settings = await getSettings();
      if (settings.location) {
        setLocation(settings.location);
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Izin lokasi diperlukan untuk menghitung waktu sholat');
        // Use Jakarta as fallback
        const fallback = { latitude: -6.2088, longitude: 106.8456, city: 'Jakarta' };
        setLocation(fallback);
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode for city name
      let city = 'Lokasi Anda';
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode.length > 0) {
          city = geocode[0].city ?? geocode[0].region ?? 'Lokasi Anda';
        }
      } catch {}

      const locationData: LocationData = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        city,
      };

      setLocation(locationData);
      await updateSettings({ location: locationData });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return { location, loading, error, refresh: requestLocation };
}
