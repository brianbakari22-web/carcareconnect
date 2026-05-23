// src/index.js — COMPLETE Car Care Connect API with Provider Routes
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

// ─── PROVIDER ROUTES ───
async function handleProvider(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);
  
  if (user.role !== 'provider' && user.role !== 'admin') {
    return json({ success: false, message: 'Provider access required' }, 403);
  }

  // GET /api/services/provider/my-services
  if (url.pathname === '/api/services/provider/my-services' && request.method === 'GET') {
    const services = await env.DB.prepare('SELECT * FROM services WHERE provider_id = ?').bind(user.id).all();
    return json({ success: true, services: services.results });
  }

  // GET /api/services/provider/bookings
  if (url.pathname === '/api/services/provider/bookings' && request.method === 'GET') {
    const bookings = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.phone 
      FROM bookings b 
      JOIN users u ON b.customer_id = u.id 
      WHERE b.provider_id = ? 
      ORDER BY b.created_at DESC
    `).bind(user.id).all();
    return json({ success: true, bookings: bookings.results });
  }

  // PATCH /api/services/provider/bookings/:id/status
  if (url.pathname.match(/^\/api\/services\/provider\/bookings\/\d+\/status$/) && request.method === 'PATCH') {
    const id = url.pathname.split('/')[5];
    const { status } = await request.json();
    await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = datetime("now") WHERE id = ? AND provider_id = ?').bind(status, id, user.id).run();
    return json({ success: true });
  }

  // GET /api/payments/provider/earnings
  if (url.pathname === '/api/payments/provider/earnings' && request.method === 'GET') {
    const earnings = await env.DB.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COALESCE(SUM(total_amount * 0.7), 0) as totalEarnings,
        COALESCE(SUM(total_amount * 0.15), 0) as platformFees,
        COUNT(*) as totalBookings
      FROM bookings 
      WHERE provider_id = ? AND status = 'completed'
    `).bind(user.id).first();
    return json({ success: true, earnings });
  }

  // GET /api/payments/provider/payout-history
  if (url.pathname === '/api/payments/provider/payout-history' && request.method === 'GET') {
    const payouts = await env.DB.prepare(`
      SELECT * FROM payments 
      WHERE provider_id = ? 
      ORDER BY created_at DESC
    `).bind(user.id).all();
    return json({ success: true, payoutHistory: payouts.results });
  }

  return json({ success: false, error: 'Provider route not found' }, 404);
}

// ─── STRIPE ROUTES ───
async function handleStripe(request, env) {
  const user = await verifyToken(request, env);

  // GET /api/stripe/account-status
  if (url.pathname === '/api/stripe/account-status' && request.method === 'GET') {
    return json({ success: true, hasAccount: false, onboardingComplete: false, status: null });
  }

  return json({ success: false, error: 'Stripe route not found' }, 404);
}

// ─── CHAT ROUTES ───
async function handleChat(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  // GET /api/chat/unread/count
  if (url.pathname === '/api/chat/unread/count' && request.method === 'GET') {
    const count = await env.DB.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND is_read = 0').bind(user.id).first();
    return json({ success: true, count: count?.count || 0 });
  }

  return json({ success: false, error: 'Chat route not found' }, 404);
}

// ─── REVIEWS ROUTES ───
async function handleReviews(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  // GET /api/reviews/my-reviews
  if (url.pathname === '/api/reviews/my-reviews' && request.method === 'GET') {
    const reviews = await env.DB.prepare(`
      SELECT r.*, u.first_name, u.last_name 
      FROM reviews r 
      JOIN users u ON r.customer_id = u.id 
      WHERE r.provider_id = ? 
      ORDER BY r.created_at DESC
    `).bind(user.id).all();
    
    const avg = await env.DB.prepare('SELECT AVG(rating) as avgRating, COUNT(*) as total FROM reviews WHERE provider_id = ?').bind(user.id).first();
    return json({ success: true, reviews: reviews.results, averageRating: avg?.avgRating || 0, totalReviews: avg?.total || 0 });
  }

  return json({ success: false, error: 'Reviews route not found' }, 404);
}

// ─── DISCOVERY ROUTES ───
async function handleDiscovery(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/discovery/providers' && request.method === 'GET') {
    const providers = await env.DB.prepare(`
      SELECT id, business_name, phone, email, is_verified, address
      FROM users WHERE role = 'provider' AND is_active = 1
    `).all();
    return json({ success: true, providers: providers.results });
  }

  return json({ success: false, error: 'Discovery route not found' }, 404);
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

      // Route to handlers
      if (path.startsWith('/api/auth')) return await handleAuth(request, env);
      if (path.startsWith('/api/discovery')) return await handleDiscovery(request, env);
      if (path.startsWith('/api/services/provider')) return await handleProvider(request, env);
      if (path.startsWith('/api/payments/provider')) return await handleProvider(request, env);
      if (path.startsWith('/api/stripe')) return await handleStripe(request, env);
      if (path.startsWith('/api/chat')) return await handleChat(request, env);
      if (path.startsWith('/api/reviews')) return await handleReviews(request, env);

      return json({ success: false, error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ success: false, error: err.message }, 500);
    }
  },
};
