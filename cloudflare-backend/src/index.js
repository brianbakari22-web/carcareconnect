// src/index.js — COMPLETE Car Care Connect API (D1 + KV)
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function verifyToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) throw new Error('No token provided');
  const decoded = jwt.verify(token, env.JWT_SECRET);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.id).first();
  if (!user) throw new Error('User not found');
  return user;
}

// ─── AUTH ROUTES ───
async function handleAuth(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    try {
      const user = await verifyToken(request, env);
      const { password, ...safeUser } = user;
      return json({ success: true, user: safeUser });
    } catch (err) {
      return json({ success: false, message: err.message }, 401);
    }
  }

  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    try {
      const { firstName, lastName, email, password, phone, role, businessName } = await request.json();
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (existing) return json({ success: false, message: 'User already exists' }, 400);

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await env.DB.prepare(
        'INSERT INTO users (first_name, last_name, email, password, phone, role, business_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(firstName, lastName, email, hashedPassword, phone || null, role || 'customer', businessName || null).run();

      const token = jwt.sign({ id: result.meta.last_row_id, email, role: role || 'customer' }, env.JWT_SECRET, { expiresIn: '7d' });
      return json({ success: true, token, user: { id: result.meta.last_row_id, firstName, lastName, email, role: role || 'customer' } });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    try {
      const { email, password, role } = await request.json();
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
      if (!user || !await bcrypt.compare(password, user.password)) return json({ success: false, message: 'Invalid credentials' }, 401);
      if (role && user.role !== role) return json({ success: false, message: 'Invalid role' }, 403);

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safeUser } = user;
      return json({ success: true, token, user: safeUser });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  return json({ success: false, error: 'Auth route not found' }, 404);
}

// ─── DISCOVERY ROUTES ───
async function handleDiscovery(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/discovery/providers' && request.method === 'GET') {
    try {
      const providers = await env.DB.prepare(`
        SELECT id, business_name, phone, email, is_verified, address
        FROM users 
        WHERE role = 'provider' AND is_active = 1
      `).all();
      return json({ success: true, providers: providers.results });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  if (url.pathname === '/api/discovery/drivers' && request.method === 'GET') {
    try {
      const drivers = await env.DB.prepare(`
        SELECT id, first_name, last_name, phone, email
        FROM users 
        WHERE role = 'driver' AND is_active = 1
      `).all();
      return json({ success: true, drivers: drivers.results });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  if (url.pathname === '/api/discovery/services' && request.method === 'GET') {
    try {
      const services = await env.DB.prepare(`
        SELECT s.*, u.business_name as provider_name 
        FROM services s 
        JOIN users u ON s.provider_id = u.id 
        WHERE s.is_active = 1
      `).all();
      return json({ success: true, services: services.results });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  if (url.pathname === '/api/discovery/stats' && request.method === 'GET') {
    try {
      const providers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "provider" AND is_active = 1').first();
      const drivers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "driver" AND is_active = 1').first();
      const services = await env.DB.prepare('SELECT COUNT(*) as count FROM services WHERE is_active = 1').first();
      return json({ success: true, stats: { 
        providers: providers?.count || 0, 
        drivers: drivers?.count || 0, 
        services: services?.count || 0 
      } });
    } catch (err) {
      return json({ success: false, error: err.message }, 500);
    }
  }

  return json({ success: false, error: 'Discovery route not found' }, 404);
}

// ─── VEHICLES ROUTES ───
async function handleVehicles(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/services/customer/vehicles' && request.method === 'GET') {
    const vehicles = await env.DB.prepare('SELECT * FROM vehicles WHERE customer_id = ?').bind(user.id).all();
    return json({ success: true, vehicles: vehicles.results });
  }

  if (url.pathname === '/api/services/customer/vehicles' && request.method === 'POST') {
    const { make, model, year, license_plate, color } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO vehicles (customer_id, make, model, year, license_plate, color) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user.id, make, model, year, license_plate, color).run();
    return json({ success: true, vehicleId: result.meta.last_row_id });
  }

  if (url.pathname.match(/^\/api\/services\/customer\/vehicles\/\d+$/) && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM vehicles WHERE id = ? AND customer_id = ?').bind(id, user.id).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'Vehicle route not found' }, 404);
}

// ─── LOYALTY ROUTES ───
async function handleLoyalty(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/loyalty/my-points' && request.method === 'GET') {
    let loyalty = await env.DB.prepare('SELECT * FROM loyalty_points WHERE user_id = ?').bind(user.id).first();
    if (!loyalty) {
      await env.DB.prepare('INSERT INTO loyalty_points (user_id, points, tier) VALUES (?, 0, "bronze")').bind(user.id).run();
      loyalty = { points: 0, tier: 'bronze' };
    }
    return json({ success: true, loyalty });
  }

  return json({ success: false, error: 'Loyalty route not found' }, 404);
}

// ─── PAYMENTS ROUTES ───
async function handlePayments(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/payments/customer/history' && request.method === 'GET') {
    const payments = await env.DB.prepare(`
      SELECT p.*, b.service_name 
      FROM payments p 
      JOIN bookings b ON p.booking_id = b.id 
      WHERE p.customer_id = ? 
      ORDER BY p.created_at DESC
    `).bind(user.id).all();
    return json({ success: true, payments: payments.results });
  }

  return json({ success: false, error: 'Payment route not found' }, 404);
}

// ─── CUSTOMER BOOKINGS ───
async function handleCustomerBookings(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/services/customer/bookings' && request.method === 'GET') {
    const bookings = await env.DB.prepare(`
      SELECT b.*, s.name as service_name, u.business_name as provider_name 
      FROM bookings b 
      JOIN services s ON b.service_id = s.id 
      JOIN users u ON b.provider_id = u.id 
      WHERE b.customer_id = ? 
      ORDER BY b.created_at DESC
    `).bind(user.id).all();
    return json({ success: true, bookings: bookings.results });
  }

  if (url.pathname === '/api/services/customer/bookings' && request.method === 'POST') {
    const { serviceId, vehicleId, bookingDate, bookingTime, isConcierge, pickupAddress, notes } = await request.json();
    const service = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(serviceId).first();
    
    const result = await env.DB.prepare(
      'INSERT INTO bookings (customer_id, provider_id, service_id, service_name, booking_date, booking_time, total_amount, is_concierge, pickup_address, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id, service.provider_id, serviceId, service.name, bookingDate, bookingTime, service.base_price, isConcierge ? 1 : 0, pickupAddress, notes, 'pending').run();
    
    return json({ success: true, booking: { id: result.meta.last_row_id, totalAmount: service.base_price } });
  }

  return json({ success: false, error: 'Customer booking route not found' }, 404);
}

// ─── MAIN ROUTER ───
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === '/api/health') {
        return json({ status: 'healthy', service: 'Car Care Connect API', timestamp: new Date().toISOString() });
      }

      // Test endpoint
      if (path === '/api/test') {
        const result = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
        return json({ success: true, dbConnected: true, userCount: result.count });
      }

      // Route to handlers
      if (path.startsWith('/api/auth')) return await handleAuth(request, env);
      if (path.startsWith('/api/discovery')) return await handleDiscovery(request, env);
      if (path.startsWith('/api/services/customer/vehicles')) return await handleVehicles(request, env);
      if (path === '/api/services/customer/bookings') return await handleCustomerBookings(request, env);
      if (path === '/api/loyalty/my-points') return await handleLoyalty(request, env);
      if (path === '/api/payments/customer/history') return await handlePayments(request, env);

      return json({ success: false, error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ success: false, error: err.message }, 500);
    }
  },
};
