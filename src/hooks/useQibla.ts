import { useState, useEffect, useRef } from 'react';
import { Magnetometer } from 'expo-sensors';
import { useLocation } from '@/hooks/useLocation';

// Kaabah coordinates
const KAABAH = { latitude: 21.4225, longitude: 39.8262 };

function calculateQibla(userLat: number, userLon: number): number {
  const lat1 = (userLat * Math.PI) / 180;
  const lat2 = (KAABAH.latitude * Math.PI) / 180;
  const deltaLon = ((KAABAH.longitude - userLon) * Math.PI) / 180;

  const y = Math.sin(deltaLon);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltaLon);

  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;
  return bearing;
}

export function useQibla() {
  const { location } = useLocation();
  const [magnetometer, setMagnetometer] = useState({ x: 0, y: 0, z: 0 });
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [available, setAvailable] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (location) {
      const angle = calculateQibla(location.latitude, location.longitude);
      setQiblaAngle(angle);
    }
  }, [location]);

  useEffect(() => {
    Magnetometer.isAvailableAsync().then(avail => {
      setAvailable(avail);
      if (avail) {
        Magnetometer.setUpdateInterval(100);
        subscriptionRef.current = Magnetometer.addListener(data => {
          setMagnetometer(data);
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          angle = (angle + 360) % 360;
          setHeading(angle);
        });
      }
    });

    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  // Arrow rotation: rotate arrow to point to qibla, accounting for device heading
  const arrowRotation = (qiblaAngle - heading + 360) % 360;

  return {
    heading,
    qiblaAngle,
    arrowRotation,
    available,
    location,
  };
}
