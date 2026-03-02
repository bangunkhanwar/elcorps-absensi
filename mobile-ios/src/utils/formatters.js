import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

/**
 * Format date to 'dddd, D MMMM YYYY'
 */
export const formatDate = (date) => dayjs(date).format('dddd, D MMMM YYYY');

/**
 * Format time to 'HH : mm : ss'
 */
export const formatTime = (date) => dayjs(date).format('HH : mm : ss');

/**
 * Format backend time string (HH:mm:ss) to 'HH : mm'
 */
export const formatTimeShort = (timeStr) => {
  if (!timeStr) return '-';
  // Backend often returns "HH:mm:ss", we want "HH : mm"
  return timeStr.substring(0, 5).replace(':', ' : ');
};

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
