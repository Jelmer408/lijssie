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
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add this to ensure the service worker is properly activated
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Add this to ensure the service worker can be properly updated
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
}); 