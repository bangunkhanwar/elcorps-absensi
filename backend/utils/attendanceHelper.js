// Helper function: Calculate distance between coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
} 

// Helper function: Calculate attendance status
function calculateStatus(currentTime, shiftTime, tolerance) {
  if (!currentTime || typeof currentTime !== 'string' || !currentTime.includes(':')) return 'Invalid current time';
  if (!shiftTime || typeof shiftTime !== 'string' || !shiftTime.includes(':')) return 'Invalid shift time';
  
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [shiftHour, shiftMinute] = shiftTime.split(':').map(Number);

  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const shiftTotalMinutes = shiftHour * 60 + shiftMinute;
  const batasTelat = shiftTotalMinutes + (tolerance || 0);

  return currentTotalMinutes <= batasTelat ? 'Tepat Waktu' : 'Terlambat';
}

// Helper function: Get current time in specific timezone
function getCurrentTimeInTimezone(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Jakarta',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  return `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
}

// Helper function: Get current date in specific timezone
function getCurrentDateInTimezone(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
}

module.exports = {
  calculateDistance,
  calculateStatus,
  getCurrentTimeInTimezone,
  getCurrentDateInTimezone
};
