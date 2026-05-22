import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [onlineDrivers, setOnlineDrivers] = useState([]);
  const socketRef = useRef(null);
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    if (!token) {
      console.log('No token, skipping socket connection');
      return;
    }
    
    // Connect to socket server
    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected:', socketRef.current.id);
      setIsConnected(true);
      setSocketId(socketRef.current.id);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
      setSocketId(null);
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
    });
    
    // Listen for driver status changes
    socketRef.current.on('driver:status-change', (data) => {
      console.log('Driver status change:', data);
      // Update online drivers list
      setOnlineDrivers(prev => {
        if (data.isOnline) {
          // Add driver if not already in list
          if (!prev.some(d => d.id === data.driverId)) {
            return [...prev, { id: data.driverId, name: data.driverName, isOnline: true }];
          }
        } else {
          // Remove driver from list
          return prev.filter(d => d.id !== data.driverId);
        }
        return prev;
      });
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);
  
  // ============ DRIVER FUNCTIONS ============
  const updateDriverLocation = useCallback((lat, lng, address) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('driver:update-location', { lat, lng, address });
    }
  }, [isConnected]);
  
  const goOnline = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('driver:go-online');
    }
  }, [isConnected]);
  
  const goOffline = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('driver:go-offline');
    }
  }, [isConnected]);
  
  // ============ CUSTOMER FUNCTIONS ============
  const subscribeToDriver = useCallback((driverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('driver:subscribe', { driverId });
    }
  }, [isConnected]);
  
  const unsubscribeFromDriver = useCallback((driverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('driver:unsubscribe', { driverId });
    }
  }, [isConnected]);
  
  const getOnlineDrivers = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('drivers:get-online');
    }
  }, [isConnected]);
  
  // ============ BOOKING FUNCTIONS ============
  const updateBookingStatus = useCallback((bookingId, status, notes = null) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('booking:update-status', { bookingId, status, notes });
    }
  }, [isConnected]);
  
  const joinBookingRoom = useCallback((bookingId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('booking:join', { bookingId });
    }
  }, [isConnected]);
  
  // ============ CHAT FUNCTIONS ============
  const sendChatMessage = useCallback((toUserId, message, bookingId = null) => {
    if (socketRef.current && isConnected && message.trim()) {
      socketRef.current.emit('chat:send', { toUserId, message, bookingId });
    }
  }, [isConnected]);
  
  const markMessagesRead = useCallback((fromUserId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat:mark-read', { fromUserId });
    }
  }, [isConnected]);
  
  const startTyping = useCallback((toUserId, bookingId = null) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', { toUserId, bookingId });
    }
  }, [isConnected]);
  
  const stopTyping = useCallback((toUserId, bookingId = null) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', { toUserId, bookingId });
    }
  }, [isConnected]);
  
  // ============ NOTIFICATION FUNCTIONS ============
  const markNotificationRead = useCallback((notificationId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('notification:read', { notificationId });
    }
  }, [isConnected]);
  
  const markAllNotificationsRead = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('notifications:read-all');
    }
  }, [isConnected]);
  
  // ============ EVENT LISTENERS ============
  const onDriverLocationUpdate = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('driver:location-update', callback);
      return () => socketRef.current.off('driver:location-update', callback);
    }
    return () => {};
  }, []);
  
  const onDriverLiveLocation = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('driver:live-location', callback);
      return () => socketRef.current.off('driver:live-location', callback);
    }
    return () => {};
  }, []);
  
  const onBookingStatusChanged = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('booking:status-changed', callback);
      return () => socketRef.current.off('booking:status-changed', callback);
    }
    return () => {};
  }, []);
  
  const onNewMessage = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:receive', callback);
      return () => socketRef.current.off('chat:receive', callback);
    }
    return () => {};
  }, []);
  
  const onRoomMessage = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:room-message', callback);
      return () => socketRef.current.off('chat:room-message', callback);
    }
    return () => {};
  }, []);
  
  const onChatHistory = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat:history', callback);
      return () => socketRef.current.off('chat:history', callback);
    }
    return () => {};
  }, []);
  
  const onTypingStart = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('typing:start', callback);
      return () => socketRef.current.off('typing:start', callback);
    }
    return () => {};
  }, []);
  
  const onTypingStop = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('typing:stop', callback);
      return () => socketRef.current.off('typing:stop', callback);
    }
    return () => {};
  }, []);
  
  const onNewNotification = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('notification:new', callback);
      return () => socketRef.current.off('notification:new', callback);
    }
    return () => {};
  }, []);
  
  const onOnlineDriversList = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('drivers:online-list', callback);
      return () => socketRef.current.off('drivers:online-list', callback);
    }
    return () => {};
  }, []);
  
  const onDriverStatusChange = useCallback((callback) => {
    if (socketRef.current) {
      socketRef.current.on('driver:status-change', callback);
      return () => socketRef.current.off('driver:status-change', callback);
    }
    return () => {};
  }, []);
  
  return {
    // State
    isConnected,
    socketId,
    onlineDrivers,
    
    // Driver actions
    updateDriverLocation,
    goOnline,
    goOffline,
    
    // Customer actions
    subscribeToDriver,
    unsubscribeFromDriver,
    getOnlineDrivers,
    
    // Booking actions
    updateBookingStatus,
    joinBookingRoom,
    
    // Chat actions
    sendChatMessage,
    markMessagesRead,
    startTyping,
    stopTyping,
    
    // Notification actions
    markNotificationRead,
    markAllNotificationsRead,
    
    // Event listeners
    onDriverLocationUpdate,
    onDriverLiveLocation,
    onBookingStatusChanged,
    onNewMessage,
    onRoomMessage,
    onChatHistory,
    onTypingStart,
    onTypingStop,
    onNewNotification,
    onOnlineDriversList,
    onDriverStatusChange
  };
};
