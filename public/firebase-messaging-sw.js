importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD-Mrope3HWDYxKX2v2Vp8vBdVO4oeM31o",
  authDomain: "boodschappenlijstje-75689.firebaseapp.com",
  projectId: "boodschappenlijstje-75689",
  storageBucket: "boodschappenlijstje-75689.firebasestorage.app",
  messagingSenderId: "977851179958",
  appId: "1:977851179958:web:d994e51827d010d6571717"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Only handle Firebase-specific events with proper async handling
self.addEventListener('push', function(event) {
  if (event.data && event.data.json().from.startsWith('firebase')) {
    const promiseChain = self.registration.showNotification(
      event.data.json().notification.title,
      {
        body: event.data.json().notification.body,
        icon: '/logo.png'
      }
    );
    event.waitUntil(promiseChain);
  }
});

// Ensure proper activation handling
self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up any old caches or resources if needed
      Promise.resolve()
    ])
  );
});

// Proper installation handling
self.addEventListener('install', function(event) {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      // Add any cache initialization if needed
      Promise.resolve()
    ])
  );
}); 