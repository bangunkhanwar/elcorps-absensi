// Service Worker for PWA and Web Push
const CACHE_NAME = 'elcorps-absensi-v1';

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
});

// Handle Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/elogo.png',
    badge: '/elogo.png',
    data: data.url
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
