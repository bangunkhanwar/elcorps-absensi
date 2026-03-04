const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const webpush = require('web-push');

// Configure web-push with VAPID keys
// These are standard protocols for identification between server and push service (Google/Apple)
const vapidKeys = {
  publicKey: 'BAYm0iUhiacDd76nnj5bzd_NMyVciyIrvb8_kjPEI2M1cbK8gp_ocAACrs_8kjMHNEl02WzxwCrF3pfAyOCwiYs',
  privateKey: 'diWYgRZeAxB-8MrEMKL15AwqI9nAoMalIY_7-Zsefcs'
};

webpush.setVapidDetails(
  'mailto:it@elcorps.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Get Public Key for frontend
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Save push subscription from browser
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const user_id = req.user.id;

    if (!endpoint || !keys) {
      return res.status(400).json({ error: 'Subscription data is invalid' });
    }

    // UPSERT: Update if already exists for this endpoint
    await pool.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) 
      DO UPDATE SET user_id = $1, p256dh = $3, auth = $4
    `, [user_id, endpoint, keys.p256dh, keys.auth]);

    res.json({ success: true, message: 'Push subscription registered' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user notification history
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Helper function to create notification & trigger real-time push
async function createNotification(userId, title, message, type) {
  try {
    // 1. Save to database for history
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, title, message, type]
    );

    // 2. Trigger Real-time Push Notification to all devices of this user
    const subscriptions = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    const payload = JSON.stringify({ title, message, type });

    for (const sub of subscriptions.rows) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      webpush.sendNotification(pushSubscription, payload).catch(err => {
        console.error('Push failed for user:', userId, err.statusCode);
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Clean up expired/invalid subscriptions automatically
          pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error in createNotification flow:', error);
    return false;
  }
}

module.exports = {
  router,
  createNotification
};
