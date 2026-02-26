import React, { useState, useEffect, useCallback } from 'react';
import { calculateDistance } from '../utils/formatters';

/**
 * Custom hook for geolocation handling with radius check
 */
export const useLocation = (targetCoords) => {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting, granted, out_of_radius, denied, gps_off, timeout, error
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // granted, denied, prompt
  const retryCount = React.useRef(0);
  const MAX_RETRIES = 2;

  // Check permission status
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      });
    }
  }, []);

  const checkLocation = useCallback(() => {
    // 1. Android/Chrome Security Check (Geolocation requires HTTPS)
    if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setStatus('error');
      console.error('[LocationHook] Geolocation blocked: Site is not secure (HTTPS required).');
      return;
    }

    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('waiting');

    // Attempt High Accuracy first
    const highAccuracyOptions = { 
      enableHighAccuracy: true, 
      timeout: 20000, // Android needs more time sometimes
      maximumAge: 0 
    };

    // Standard Accuracy Fallback
    const standardOptions = { 
      enableHighAccuracy: false, 
      timeout: 10000, 
      maximumAge: 60000 
    };

    const onSuccess = (position) => {
      retryCount.current = 0;
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
    };

    const onError = (error) => {
      console.error('[LocationHook] Error:', error);
      
      // Fallback: If High Accuracy times out, try standard accuracy
      if (error.code === error.TIMEOUT && highAccuracyOptions.enableHighAccuracy) {
        console.warn('[LocationHook] High accuracy timeout, trying standard accuracy...');
        navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
          // Final Error Handling
          if (err.code === 1) setStatus('denied');
          else if (err.code === 2) setStatus('gps_off');
          else if (err.code === 3) setStatus('timeout');
          else setStatus('error');
        }, standardOptions);
        return;
      }

      if (error.code === 1) setStatus('denied');
      else if (error.code === 2) setStatus('gps_off');
      else if (error.code === 3) setStatus('timeout');
      else setStatus('error');
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, highAccuracyOptions);
  }, [targetCoords]);

  useEffect(() => {
    checkLocation();
  }, [checkLocation]);

  return { location, status, permissionStatus, refresh: checkLocation };
};
