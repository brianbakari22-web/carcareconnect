// Register service worker and request notification permission
export const initializePushNotifications = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted');
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send a push notification
export const sendPushNotification = (title, body, icon = '/favicon.ico') => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  try {
    const notification = new Notification(title, {
      body: body,
      icon: icon,
      badge: icon,
      tag: 'car-care-connect',
      requireInteraction: false
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error('Push notification error:', error);
  }
};

// Request permission on user action
export const requestNotificationPermission = () => {
  if (!('Notification' in window)) {
    alert('This browser does not support notifications');
    return;
  }
  
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      sendPushNotification('Car Care Connect', 'Notifications enabled! You will receive real-time updates.');
    }
  });
};
