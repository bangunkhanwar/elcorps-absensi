import { attendanceAPI } from '../services/api';

/**
 * Global variable to store time offset in milliseconds
 * Offset = ServerTime - LocalTime
 */
let timeOffset = 0;
let isSynced = false;

/**
 * Synchronize local time with server time
 */
export const syncTimeWithServer = async () => {
  try {
    const startTime = Date.now();
    const response = await attendanceAPI.getServerTime();
    const endTime = Date.now();
    
    if (response.success && response.data?.timestamp) {
      // Latency correction: assume network delay is half of RTT
      const latency = (endTime - startTime) / 2;
      const serverTime = response.data.timestamp + latency;
      
      timeOffset = serverTime - Date.now();
      isSynced = true;
      console.log(`[TimeSync] Success. Offset: ${timeOffset}ms (Latency: ${latency}ms)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[TimeSync] Failed to sync time:', error);
    return false;
  }
};

/**
 * Get accurate current date based on server sync
 */
export const getTrueDate = () => {
  return new Date(Date.now() + timeOffset);
};

/**
 * Check if time has been synced
 */
export const isTimeSynced = () => isSynced;