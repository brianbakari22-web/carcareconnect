export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers for frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://carcareconnect.pages.dev',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // WebSocket endpoint for drivers
    if (url.pathname === '/ws/driver') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      this.handleDriverConnection(server, env);
      
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: corsHeaders,
      });
    }
    
    // WebSocket endpoint for customers
    if (url.pathname === '/ws/customer') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      this.handleCustomerConnection(server, env);
      
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: corsHeaders,
      });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'Car Care Connect Real-Time',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Get online drivers (HTTP endpoint)
    if (url.pathname === '/api/online-drivers') {
      const onlineDrivers = await env.DRIVER_STATUS.list();
      const drivers = [];
      for (const key of onlineDrivers.keys) {
        drivers.push(key.name);
      }
      return new Response(JSON.stringify({ success: true, drivers }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Get driver location (HTTP endpoint)
    if (url.pathname.startsWith('/api/driver-location/')) {
      const driverId = url.pathname.split('/').pop();
      const location = await env.DRIVER_LOCATIONS.get(driverId);
      return new Response(JSON.stringify({ 
        success: true, 
        location: location ? JSON.parse(location) : null 
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    return new Response(JSON.stringify({
      message: 'Car Care Connect Real-Time Service',
      version: '1.0.0',
      endpoints: {
        websocket: {
          driver: '/ws/driver',
          customer: '/ws/customer'
        },
        http: {
          health: '/health',
          onlineDrivers: '/api/online-drivers',
          driverLocation: '/api/driver-location/:id'
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
  
  handleDriverConnection(server, env) {
    server.accept();
    let driverId = null;
    
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'register') {
          driverId = data.driverId;
          // Store driver as online
          await env.DRIVER_STATUS.put(driverId, 'online');
          console.log(`✅ Driver ${driverId} registered`);
          server.send(JSON.stringify({ type: 'registered', success: true }));
        }
        
        if (data.type === 'location' && driverId) {
          // Store driver location
          const locationData = {
            lat: data.location.lat,
            lng: data.location.lng,
            timestamp: new Date().toISOString()
          };
          await env.DRIVER_LOCATIONS.put(driverId, JSON.stringify(locationData));
          
          // Get customers tracking this driver
          const followers = await env.DRIVER_FOLLOWERS.get(driverId) || '[]';
          const followersList = JSON.parse(followers);
          
          // Broadcast location to all tracking customers
          for (const customerId of followersList) {
            server.send(JSON.stringify({
              type: 'location-update',
              driverId: driverId,
              location: locationData
            }));
          }
        }
        
        if (data.type === 'offline' && driverId) {
          await env.DRIVER_STATUS.delete(driverId);
          await env.DRIVER_LOCATIONS.delete(driverId);
          server.send(JSON.stringify({ type: 'offline-confirmed' }));
        }
      } catch (error) {
        console.error('Error:', error);
        server.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });
    
    server.addEventListener('close', async () => {
      if (driverId) {
        await env.DRIVER_STATUS.delete(driverId);
        console.log(`❌ Driver ${driverId} disconnected`);
      }
    });
  },
  
  handleCustomerConnection(server, env) {
    server.accept();
    let customerId = null;
    let trackingDriver = null;
    
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'register') {
          customerId = data.customerId;
          console.log(`✅ Customer ${customerId} connected`);
        }
        
        if (data.type === 'track-driver' && customerId) {
          trackingDriver = data.driverId;
          
          // Add customer to driver's followers
          const followers = await env.DRIVER_FOLLOWERS.get(data.driverId) || '[]';
          const followersList = JSON.parse(followers);
          if (!followersList.includes(customerId)) {
            followersList.push(customerId);
            await env.DRIVER_FOLLOWERS.put(data.driverId, JSON.stringify(followersList));
          }
          
          // Send current location immediately
          const location = await env.DRIVER_LOCATIONS.get(data.driverId);
          if (location) {
            server.send(JSON.stringify({
              type: 'location-update',
              driverId: data.driverId,
              location: JSON.parse(location)
            }));
          }
          
          server.send(JSON.stringify({ type: 'tracking-started', driverId: data.driverId }));
        }
        
        if (data.type === 'stop-tracking' && customerId && trackingDriver) {
          // Remove customer from driver's followers
          const followers = await env.DRIVER_FOLLOWERS.get(trackingDriver) || '[]';
          const followersList = JSON.parse(followers);
          const updatedList = followersList.filter(id => id !== customerId);
          await env.DRIVER_FOLLOWERS.put(trackingDriver, JSON.stringify(updatedList));
          
          server.send(JSON.stringify({ type: 'tracking-stopped' }));
          trackingDriver = null;
        }
      } catch (error) {
        console.error('Error:', error);
        server.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });
    
    server.addEventListener('close', async () => {
      if (customerId && trackingDriver) {
        // Clean up on disconnect
        const followers = await env.DRIVER_FOLLOWERS.get(trackingDriver) || '[]';
        const followersList = JSON.parse(followers);
        const updatedList = followersList.filter(id => id !== customerId);
        await env.DRIVER_FOLLOWERS.put(trackingDriver, JSON.stringify(updatedList));
      }
      console.log(`❌ Customer ${customerId} disconnected`);
    });
  }
};
