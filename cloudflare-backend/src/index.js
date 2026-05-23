// src/index.js — Car Care Connect API (D1 + KV)
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

  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const { firstName, lastName, email, password, phone, role, businessName } = await request.json();
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return json({ success: false, message: 'User already exists' }, 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await env.DB.prepare(
      'INSERT INTO users (first_name, last_name, email, password, phone, role, business_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(firstName, lastName, email, hashedPassword, phone || null, role || 'customer', businessName || null).run();

    const token = jwt.sign({ id: result.meta.last_row_id, email, role: role || 'customer' }, env.JWT_SECRET, { expiresIn: '7d' });
    return json({ success: true, token, user: { id: result.meta.last_row_id, firstName, lastName, email, role: role || 'customer' } });
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const { email, password, role } = await request.json();
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!user || !await bcrypt.compare(password, user.password)) return json({ success: false, message: 'Invalid credentials' }, 401);
    if (role && user.role !== role) return json({ success: false, message: 'Invalid role' }, 403);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    return json({ success: true, token, user: safeUser });
  }

  return json({ success: false, error: 'Auth route not found' }, 404);
}

// ─── BOOKINGS ROUTES ───
async function handleBookings(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/bookings' && request.method === 'POST') {
    const { serviceId, providerId, scheduledDate, scheduledTime, notes, vehicleInfo, location } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO bookings (customer_id, provider_id, service_id, scheduled_date, scheduled_time, notes, vehicle_info, location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id, providerId, serviceId, scheduledDate, scheduledTime, notes || null, JSON.stringify(vehicleInfo), location || null, 'pending').run();
    return json({ success: true, bookingId: result.meta.last_row_id });
  }

  if (url.pathname === '/api/bookings' && request.method === 'GET') {
    const bookings = await env.DB.prepare(
      user.role === 'customer'
        ? 'SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM bookings WHERE provider_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return json({ success: true, bookings: bookings.results });
  }

  if (url.pathname.match(/^\/api\/bookings\/\d+$/) && request.method === 'PATCH') {
    const id = url.pathname.split('/').pop();
    const { status } = await request.json();
    await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = datetime("now") WHERE id = ?').bind(status, id).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'Booking route not found' }, 404);
}

// ─── SERVICES ROUTES ───
async function handleServices(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/services' && request.method === 'GET') {
    const services = await env.DB.prepare('SELECT * FROM services WHERE is_active = 1').all();
    return json({ success: true, services: services.results });
  }

  if (url.pathname === '/api/services' && request.method === 'POST') {
    const user = await verifyToken(request, env);
    if (user.role !== 'provider' && user.role !== 'admin') return json({ success: false, message: 'Unauthorized' }, 403);
    const { name, description, category, basePrice, duration } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO services (provider_id, name, description, category, base_price, duration, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    ).bind(user.id, name, description, category, basePrice, duration).run();
    return json({ success: true, serviceId: result.meta.last_row_id });
  }

  return json({ success: false, error: 'Service route not found' }, 404);
}

// ─── PAYMENTS ROUTES ───
async function handlePayments(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/payments/create-intent' && request.method === 'POST') {
    const { bookingId, amount } = await request.json();
    // Stripe integration placeholder — use env.STRIPE_SECRET_KEY
    return json({ success: true, clientSecret: 'pi_placeholder', bookingId, amount });
  }

  if (url.pathname === '/api/payments/confirm' && request.method === 'POST') {
    const { bookingId, paymentIntentId } = await request.json();
    await env.DB.prepare('UPDATE bookings SET payment_status = "paid", updated_at = datetime("now") WHERE id = ?').bind(bookingId).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'Payment route not found' }, 404);
}

// ─── DRIVER ROUTES ───
async function handleDriver(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/driver/location' && request.method === 'POST') {
    const { lat, lng } = await request.json();
    await env.DRIVER_LOCATIONS.put(String(user.id), JSON.stringify({ lat, lng, timestamp: new Date().toISOString() }));
    await env.DRIVER_STATUS.put(String(user.id), 'online');
    return json({ success: true });
  }

  if (url.pathname === '/api/driver/status' && request.method === 'PATCH') {
    const { status } = await request.json();
    await env.DRIVER_STATUS.put(String(user.id), status);
    return json({ success: true });
  }

  if (url.pathname === '/api/driver/track' && request.method === 'GET') {
    const driverId = url.searchParams.get('driverId');
    const location = await env.DRIVER_LOCATIONS.get(driverId);
    return json({ success: true, location: location ? JSON.parse(location) : null });
  }

  if (url.pathname === '/api/driver/online' && request.method === 'GET') {
    const list = await env.DRIVER_STATUS.list();
    const onlineDrivers = [];
    for (const key of list.keys) {
      const status = await env.DRIVER_STATUS.get(key.name);
      if (status === 'online') {
        const loc = await env.DRIVER_LOCATIONS.get(key.name);
        onlineDrivers.push({ driverId: key.name, location: loc ? JSON.parse(loc) : null });
      }
    }
    return json({ success: true, drivers: onlineDrivers });
  }

  return json({ success: false, error: 'Driver route not found' }, 404);
}

// ─── REVIEWS ROUTES ───
async function handleReviews(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/reviews' && request.method === 'POST') {
    const user = await verifyToken(request, env);
    const { bookingId, providerId, rating, comment } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO reviews (booking_id, customer_id, provider_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
    ).bind(bookingId, user.id, providerId, rating, comment || null).run();
    return json({ success: true, reviewId: result.meta.last_row_id });
  }

  if (url.pathname.match(/^\/api\/reviews\/provider\/\d+$/) && request.method === 'GET') {
    const providerId = url.pathname.split('/').pop();
    const reviews = await env.DB.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC').bind(providerId).all();
    return json({ success: true, reviews: reviews.results });
  }

  return json({ success: false, error: 'Review route not found' }, 404);
}

// ─── ADMIN ROUTES ───
async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);
  if (user.role !== 'admin') return json({ success: false, message: 'Admin only' }, 403);

  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    const users = await env.DB.prepare('SELECT id, first_name, last_name, email, role, is_active, created_at FROM users').all();
    return json({ success: true, users: users.results });
  }

  if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
    const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const bookings = await env.DB.prepare('SELECT COUNT(*) as count FROM bookings').first();
    return json({ success: true, stats: { totalUsers: users.count, totalBookings: bookings.count } });
  }

  return json({ success: false, error: 'Admin route not found' }, 404);
}

// ─── PROMO ROUTES ───
async function handlePromo(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/promo/validate' && request.method === 'POST') {
    const { code } = await request.json();
    const promo = await env.DB.prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND expires_at > datetime("now")').bind(code).first();
    if (!promo) return json({ success: false, message: 'Invalid or expired promo code' }, 404);
    return json({ success: true, promo });
  }

  return json({ success: false, error: 'Promo route not found' }, 404);
}

// ─── LOYALTY ROUTES ───
async function handleLoyalty(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/loyalty/balance' && request.method === 'GET') {
    const loyalty = await env.DB.prepare('SELECT * FROM loyalty_points WHERE user_id = ?').bind(user.id).first();
    return json({ success: true, points: loyalty?.points || 0, tier: loyalty?.tier || 'bronze' });
  }

  return json({ success: false, error: 'Loyalty route not found' }, 404);
}

// ─── CHAT ROUTES ───
async function handleChat(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/chat/messages' && request.method === 'GET') {
    const bookingId = url.searchParams.get('bookingId');
    const messages = await env.DB.prepare('SELECT * FROM chat_messages WHERE booking_id = ? ORDER BY created_at ASC').bind(bookingId).all();
    return json({ success: true, messages: messages.results });
  }

  if (url.pathname === '/api/chat/messages' && request.method === 'POST') {
    const { bookingId, message } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO chat_messages (booking_id, sender_id, message) VALUES (?, ?, ?)'
    ).bind(bookingId, user.id, message).run();
    return json({ success: true, messageId: result.meta.last_row_id });
  }

  return json({ success: false, error: 'Chat route not found' }, 404);
}

// ─── WHATSAPP ROUTES ───
async function handleWhatsApp(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/whatsapp/webhook' && request.method === 'POST') {
    // WhatsApp webhook handler placeholder
    return json({ success: true });
  }

  if (url.pathname === '/api/whatsapp/webhook' && request.method === 'GET') {
    // WhatsApp verification placeholder
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    return new Response(challenge || '', { status: 200 });
  }

  return json({ success: false, error: 'WhatsApp route not found' }, 404);
}

// ─── MAIN ROUTER ───
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    try {
      // Health check
      if (url.pathname === '/api/health') {
        return json({ status: 'healthy', service: 'Car Care Connect API', timestamp: new Date().toISOString() });
      }

      // Test D1 connection
      if (url.pathname === '/api/test') {
        const result = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
        return json({ success: true, dbConnected: true, userCount: result.count });
      }

      // Route to handlers
      if (url.pathname.startsWith('/api/auth')) return await handleAuth(request, env);
      if (url.pathname.startsWith('/api/bookings')) return await handleBookings(request, env);
      if (url.pathname.startsWith('/api/services')) return await handleServices(request, env);
      if (url.pathname.startsWith('/api/payments')) return await handlePayments(request, env);
      if (url.pathname.startsWith('/api/driver')) return await handleDriver(request, env);
      if (url.pathname.startsWith('/api/reviews')) return await handleReviews(request, env);
      if (url.pathname.startsWith('/api/admin')) return await handleAdmin(request, env);
      if (url.pathname.startsWith('/api/promo')) return await handlePromo(request, env);
      if (url.pathname.startsWith('/api/loyalty')) return await handleLoyalty(request, env);
      if (url.pathname.startsWith('/api/chat')) return await handleChat(request, env);
      if (url.pathname.startsWith('/api/whatsapp')) return await handleWhatsApp(request, env);

      return json({ success: false, error: 'Not found' }, 404);
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.message === 'No token provided') {
        return json({ success: false, message: 'Unauthorized: ' + err.message }, 401);
      }
      return json({ success: false, error: err.message }, 500);
    }
  },
};
