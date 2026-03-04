import { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      if (response.success) {
        const newNotifications = response.data;
        
        // Find unread ones that we haven't shown yet (simulated for this session)
        const unread = newNotifications.filter(n => !n.is_read);
        setUnreadCount(unread.length);
        
        // If there's a new unread notification that's very recent (last 30 seconds)
        // and we are not on the first load, show browser notification
        if (notifications.length > 0) {
          const latestStoredId = notifications[0]?.id;
          const trulyNew = newNotifications.filter(n => !n.is_read && n.id > latestStoredId);
          
          trulyNew.forEach(n => {
            showBrowserNotification(n.title, n.message);
          });
        }

        setNotifications(newNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const showBrowserNotification = (title, message) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const options = {
        body: message,
        icon: "/elogo.png",
        badge: "/elogo.png",
        vibrate: [200, 100, 200]
      };

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    pollingRef.current = setInterval(fetchNotifications, 30000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    refresh: fetchNotifications
  };
};
