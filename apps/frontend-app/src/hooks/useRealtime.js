import { useEffect, useRef, useState } from 'react';

const REALTIME_URL = 'wss://carcare-realtime.brianbakari22.workers.dev';

export const useRealtime = (type, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [location, setLocation] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    
    let wsEndpoint = '';
    if (type === 'driver') wsEndpoint = `${REALTIME_URL}/ws/driver`;
    else if (type === 'customer') wsEndpoint = `${REALTIME_URL}/ws/customer`;
    else if (type === 'provider') wsEndpoint = `${REALTIME_URL}/ws/provider`;
    else return;

    const ws = new WebSocket(wsEndpoint);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`✅ Connected to real-time as ${type}`);
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'register', [`${type}Id`]: userId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
        if (data.type === 'location-update') {
          setLocation(data.location);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('❌ Disconnected from real-time');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [type, userId]);

  const sendLocation = (lat, lng) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'location',
        location: { lat, lng }
      }));
    }
  };

  const trackDriver = (driverId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'track-driver',
        driverId
      }));
    }
  };

  const updateStatus = (status) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'status',
        status
      }));
    }
  };

  const updateBookingStatus = (bookingId, status, customerId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'booking-status',
        bookingId,
        status,
        customerId
      }));
    }
  };

  return {
    isConnected,
    messages,
    location,
    sendLocation,
    trackDriver,
    updateStatus,
    updateBookingStatus
  };
};
