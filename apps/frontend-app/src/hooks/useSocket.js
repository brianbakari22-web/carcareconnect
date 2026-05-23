// hooks/useSocket.js - Cloudflare WebSocket Connection
import { useEffect, useRef, useState } from 'react';

const WS_URL = 'wss://carcare-realtime.brianbakari22.workers.dev';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const [driverLocations, setDriverLocations] = useState({});

  useEffect(() => {
    // Connect to Cloudflare WebSocket
    const ws = new WebSocket(`${WS_URL}/ws/driver`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected to Cloudflare');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 WebSocket message:', data);
        
        if (data.type === 'location-update') {
          setDriverLocations(prev => ({
            ...prev,
            [data.driverId]: data.location
          }));
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          console.log('🔄 Reconnecting...');
          const newWs = new WebSocket(`${WS_URL}/ws/driver`);
          socketRef.current = newWs;
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const updateDriverLocation = (lat, lng) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'location',
        location: { lat, lng }
      }));
    }
  };

  const goOnline = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'status',
        status: 'online'
      }));
    }
  };

  const goOffline = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'status',
        status: 'offline'
      }));
    }
  };

  const updateBookingStatus = (bookingId, status) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'booking-status',
        bookingId,
        status
      }));
    }
  };

  const joinBookingRoom = (bookingId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'join-booking',
        bookingId
      }));
    }
  };

  const subscribeToDriver = (driverId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'track-driver',
        driverId
      }));
    }
  };

  const unsubscribeFromDriver = (driverId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'stop-tracking',
        driverId
      }));
    }
  };

  // Event listeners
  const onDriverLiveLocation = (callback) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'location-update') {
        callback(data);
      }
    };
    socketRef.current?.addEventListener('message', handler);
    return () => socketRef.current?.removeEventListener('message', handler);
  };

  const onBookingStatusChanged = (callback) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'booking-update') {
        callback(data);
      }
    };
    socketRef.current?.addEventListener('message', handler);
    return () => socketRef.current?.removeEventListener('message', handler);
  };

  const onNewNotification = (callback) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        callback(data);
      }
    };
    socketRef.current?.addEventListener('message', handler);
    return () => socketRef.current?.removeEventListener('message', handler);
  };

  const onDriverStatusChange = (callback) => {
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'driver-status') {
        callback(data);
      }
    };
    socketRef.current?.addEventListener('message', handler);
    return () => socketRef.current?.removeEventListener('message', handler);
  };

  return {
    isConnected,
    driverLocations,
    updateDriverLocation,
    goOnline,
    goOffline,
    updateBookingStatus,
    joinBookingRoom,
    subscribeToDriver,
    unsubscribeFromDriver,
    onDriverLiveLocation,
    onBookingStatusChanged,
    onNewNotification,
    onDriverStatusChange
  };
};
