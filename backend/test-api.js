const pool = require('./config/database');
const User = require('./models/user');
const Attendance = require('./models/attendance');
const { getCurrentDateInTimezone } = require('./utils/attendanceHelper');

async function test() {
  try {
    const userId = 28; // User with NULL unit_kerja_id
    console.log('Testing for user:', userId);
    
    const user = await User.findByIdWithUnitAndShift(userId);
    console.log('User found:', user.nama);
    
    const timezone = user.timezone || 'Asia/Jakarta';
    const today = getCurrentDateInTimezone(timezone);
    console.log('Today:', today);
    
    const attendance = await Attendance.findByUserAndDate(userId, today);
    console.log('Attendance found:', attendance ? 'Yes' : 'No');
    
    const result = {
      success: true,
      data: attendance ? {
        ...attendance,
        unit_kerja: {
          latitude: user.latitude,
          longitude: user.longitude,
          radius_meter: user.radius_meter,
          nama_unit: user.nama_unit
        }
      } : {
        unit_kerja: {
          latitude: user.latitude,
          longitude: user.longitude,
          radius_meter: user.radius_meter,
          nama_unit: user.nama_unit
        }
      }
    };
    
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

test();
