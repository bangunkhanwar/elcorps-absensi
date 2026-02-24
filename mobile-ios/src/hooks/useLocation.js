import { useState, useEffect, useCallback } from 'react';
import { calculateDistance } from '../utils/formatters';

/**
 * Custom hook for geolocation handling with radius check
 */
export const useLocation = (targetCoords) => {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting, granted, out_of_radius, denied, gps_off, error

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('waiting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracy: position.coords.accuracy
        };
        setLocation(current);

        if (targetCoords?.latitude && targetCoords?.longitude) {
          const distance = calculateDistance(
            parseFloat(current.latitude),
            parseFloat(current.longitude),
            parseFloat(targetCoords.latitude),
            parseFloat(targetCoords.longitude)
          );
          
          if (distance > (targetCoords.radius_meter || 100)) {
            setStatus('out_of_radius');
          } else {
            setStatus('granted');
          }
        } else {
          setStatus('granted');
        }
      },
      (error) => {
        console.error('[LocationHook] Error:', error);
        if (error.code === 1) setStatus('denied');
        else if (error.code === 2) setStatus('gps_off');
        else setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [targetCoords]);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  return { location, status, refresh: checkLocation };
};
