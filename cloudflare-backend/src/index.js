// src/index.js — COMPLETE Car Care Connect API (All Dashboards: Customer, Provider, Driver, Admin)
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

// ==================== AUTH ROUTES ====================
async function handleAuth(request, env) {
  const url = new URL(request.url);

  // GET /api/auth/me
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    try {
      const user = await verifyToken(request, env);
      const { password, ...safeUser } = user;
      return json({ success: true, user: safeUser });
    } catch (err) {
      return json({ success: false, message: err.message }, 401);
    }
  }

  // POST /api/auth/register
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

  // POST /api/auth/login
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

// ==================== CUSTOMER ROUTES ====================
async function handleCustomer(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  // GET /api/customer/profile
  if (url.pathname === '/api/customer/profile' && request.method === 'GET') {
    const { password, ...safeUser } = user;
    return json({ success: true, user: safeUser });
  }

  // PUT /api/customer/profile
  if (url.pathname === '/api/customer/profile' && request.method === 'PUT') {
    const { firstName, lastName, phone, address } = await request.json();
    await env.DB.prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(firstName, lastName, phone, address, user.id).run();
    return json({ success: true });
  }

  // GET /api/services/customer/vehicles
  if (url.pathname === '/api/services/customer/vehicles' && request.method === 'GET') {
    const vehicles = await env.DB.prepare('SELECT * FROM vehicles WHERE customer_id = ?').bind(user.id).all();
    return json({ success: true, vehicles: vehicles.results });
  }

  // POST /api/services/customer/vehicles
  if (url.pathname === '/api/services/customer/vehicles' && request.method === 'POST') {
    const { make, model, year, license_plate, color } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO vehicles (customer_id, make, model, year, license_plate, color) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user.id, make, model, year, license_plate, color).run();
    return json({ success: true, vehicleId: result.meta.last_row_id });
  }

  // DELETE /api/services/customer/vehicles/:id
  if (url.pathname.match(/^\/api\/services\/customer\/vehicles\/\d+$/) && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM vehicles WHERE id = ? AND customer_id = ?').bind(id, user.id).run();
    return json({ success: true });
  }

  // GET /api/services/customer/bookings
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

  // POST /api/services/customer/bookings
  if (url.pathname === '/api/services/customer/bookings' && request.method === 'POST') {
    const { serviceId, vehicleId, bookingDate, bookingTime, isConcierge, pickupAddress, notes } = await request.json();
    const service = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(serviceId).first();
    
    const result = await env.DB.prepare(
      'INSERT INTO bookings (customer_id, provider_id, service_id, service_name, booking_date, booking_time, total_amount, is_concierge, pickup_address, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id, service.provider_id, serviceId, service.name, bookingDate, bookingTime, service.base_price, isConcierge ? 1 : 0, pickupAddress, notes, 'pending').run();
    
    return json({ success: true, booking: { id: result.meta.last_row_id, totalAmount: service.base_price } });
  }

  // GET /api/payments/customer/history
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

  return json({ success: false, error: 'Customer route not found' }, 404);
}

// ==================== PROVIDER ROUTES ====================
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

  // POST /api/services (create service)
  if (url.pathname === '/api/services' && request.method === 'POST') {
    const { name, description, category, basePrice, duration } = await request.json();
    const result = await env.DB.prepare(
      'INSERT INTO services (provider_id, name, description, category, base_price, duration, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    ).bind(user.id, name, description, category, basePrice, duration).run();
    return json({ success: true, serviceId: result.meta.last_row_id });
  }

  // PUT /api/services/:id (update service)
  if (url.pathname.match(/^\/api\/services\/\d+$/) && request.method === 'PUT') {
    const id = url.pathname.split('/').pop();
    const { name, description, category, basePrice, duration } = await request.json();
    await env.DB.prepare('UPDATE services SET name = ?, description = ?, category = ?, base_price = ?, duration = ?, updated_at = datetime("now") WHERE id = ? AND provider_id = ?')
      .bind(name, description, category, basePrice, duration, id, user.id).run();
    return json({ success: true });
  }

  // DELETE /api/services/:id
  if (url.pathname.match(/^\/api\/services\/\d+$/) && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM services WHERE id = ? AND provider_id = ?').bind(id, user.id).run();
    return json({ success: true });
  }

  // PATCH /api/services/:id/toggle-status
  if (url.pathname.match(/^\/api\/services\/\d+\/toggle-status$/) && request.method === 'PATCH') {
    const id = url.pathname.split('/')[3];
    const service = await env.DB.prepare('SELECT is_active FROM services WHERE id = ?').bind(id).first();
    await env.DB.prepare('UPDATE services SET is_active = ? WHERE id = ?').bind(service.is_active ? 0 : 1, id).run();
    return json({ success: true });
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

  // PUT /api/services/provider/bookings/:id/status
  if (url.pathname.match(/^\/api\/services\/provider\/bookings\/\d+\/status$/) && request.method === 'PUT') {
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

  // GET /api/provider/bank-account
  if (url.pathname === '/api/provider/bank-account' && request.method === 'GET') {
    return json({ success: true, bankAccount: null });
  }

  // POST /api/provider/business-profile
  if (url.pathname === '/api/provider/business-profile' && request.method === 'PUT') {
    const { businessName, phone, address, businessLicense } = await request.json();
    await env.DB.prepare('UPDATE users SET business_name = ?, phone = ?, address = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(businessName, phone, address, user.id).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'Provider route not found' }, 404);
}

// ==================== DRIVER ROUTES ====================
async function handleDriver(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);
  
  if (user.role !== 'driver' && user.role !== 'admin') {
    return json({ success: false, message: 'Driver access required' }, 403);
  }

  // GET /api/driver/dashboard
  if (url.pathname === '/api/driver/dashboard' && request.method === 'GET') {
    // Get available deliveries (concierge bookings without driver)
    const available = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.phone, u.address
      FROM bookings b 
      JOIN users u ON b.customer_id = u.id 
      WHERE b.is_concierge = 1 AND b.driver_id IS NULL AND b.status = 'confirmed'
    `).all();
    
    // Get active jobs
    const active = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.phone, u.address
      FROM bookings b 
      JOIN users u ON b.customer_id = u.id 
      WHERE b.driver_id = ? AND b.status IN ('driver-assigned', 'in-progress')
    `).bind(user.id).all();
    
    // Get history
    const history = await env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name
      FROM bookings b 
      JOIN users u ON b.customer_id = u.id 
      WHERE b.driver_id = ? AND b.status IN ('completed', 'cancelled')
      ORDER BY b.created_at DESC
    `).bind(user.id).all();
    
    return json({ success: true, data: { deliveries: { available: available.results, active: active.results, history: history.results }, isOnline: false } });
  }

  // POST /api/driver/accept/:id
  if (url.pathname.match(/^\/api\/driver\/accept\/\d+$/) && request.method === 'POST') {
    const id = url.pathname.split('/').pop();
    await env.DB.prepare('UPDATE bookings SET driver_id = ?, status = "driver-assigned", updated_at = datetime("now") WHERE id = ?').bind(user.id, id).run();
    return json({ success: true });
  }

  // PUT /api/driver/delivery/:id/status
  if (url.pathname.match(/^\/api\/driver\/delivery\/\d+\/status$/) && request.method === 'PUT') {
    const id = url.pathname.split('/')[4];
    const { status } = await request.json();
    await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = datetime("now") WHERE id = ? AND driver_id = ?').bind(status, id, user.id).run();
    return json({ success: true });
  }

  // PATCH /api/driver/status
  if (url.pathname === '/api/driver/status' && request.method === 'PATCH') {
    const { isOnline } = await request.json();
    await env.DRIVER_STATUS.put(String(user.id), isOnline ? 'online' : 'offline');
    return json({ success: true });
  }

  // GET /api/driver/online
  if (url.pathname === '/api/driver/online' && request.method === 'GET') {
    const list = await env.DRIVER_STATUS.list();
    const onlineDrivers = [];
    for (const key of list.keys) {
      const status = await env.DRIVER_STATUS.get(key.name);
      if (status === 'online') {
        onlineDrivers.push(key.name);
      }
    }
    return json({ success: true, drivers: onlineDrivers });
  }

  // PUT /api/driver/vehicle
  if (url.pathname === '/api/driver/vehicle' && request.method === 'PUT') {
    const { model, color, plate, year } = await request.json();
    await env.DB.prepare('UPDATE users SET vehicle_model = ?, vehicle_color = ?, vehicle_plate = ?, vehicle_year = ? WHERE id = ?')
      .bind(model, color, plate, year, user.id).run();
    return json({ success: true });
  }

  // POST /api/driver/payout
  if (url.pathname === '/api/driver/payout' && request.method === 'POST') {
    const { amount } = await request.json();
    return json({ success: true, message: 'Payout requested' });
  }

  return json({ success: false, error: 'Driver route not found' }, 404);
}

// ==================== ADMIN ROUTES ====================
async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);
  
  if (user.role !== 'admin') {
    return json({ success: false, message: 'Admin access required' }, 403);
  }

  // GET /api/admin/stats
  if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
    const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const providers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "provider"').first();
    const drivers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "driver"').first();
    const customers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "customer"').first();
    const bookings = await env.DB.prepare('SELECT COUNT(*) as count FROM bookings').first();
    const completed = await env.DB.prepare('SELECT COUNT(*) as count FROM bookings WHERE status = "completed"').first();
    const revenue = await env.DB.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = "completed"').first();
    
    return json({ success: true, stats: { 
      users: { total: users.count, providers: providers.count, drivers: drivers.count, customers: customers.count },
      bookings: { total: bookings.count, completed: completed.count },
      payments: { totalRevenue: revenue.total }
    } });
  }

  // GET /api/admin/users
  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    const users = await env.DB.prepare('SELECT id, first_name, last_name, email, phone, role, business_name, is_active, is_verified, created_at FROM users').all();
    return json({ success: true, users: users.results });
  }

  // GET /api/admin/bookings
  if (url.pathname === '/api/admin/bookings' && request.method === 'GET') {
    const bookings = await env.DB.prepare(`
      SELECT b.*, c.first_name as customer_first, c.last_name as customer_last, p.business_name as provider_name
      FROM bookings b 
      JOIN users c ON b.customer_id = c.id 
      JOIN users p ON b.provider_id = p.id 
      ORDER BY b.created_at DESC
    `).all();
    return json({ success: true, bookings: bookings.results });
  }

  // GET /api/admin/services
  if (url.pathname === '/api/admin/services' && request.method === 'GET') {
    const services = await env.DB.prepare(`
      SELECT s.*, u.business_name as provider_name 
      FROM services s 
      JOIN users u ON s.provider_id = u.id
    `).all();
    return json({ success: true, services: services.results });
  }

  // PUT /api/admin/users/:id
  if (url.pathname.match(/^\/api\/admin\/users\/\d+$/) && request.method === 'PUT') {
    const id = url.pathname.split('/').pop();
    const { isActive, isVerified } = await request.json();
    if (isActive !== undefined) await env.DB.prepare('UPDATE users SET is_active = ? WHERE id = ?').bind(isActive ? 1 : 0, id).run();
    if (isVerified !== undefined) await env.DB.prepare('UPDATE users SET is_verified = ? WHERE id = ?').bind(isVerified ? 1 : 0, id).run();
    return json({ success: true });
  }

  // DELETE /api/admin/users/:id
  if (url.pathname.match(/^\/api\/admin\/users\/\d+$/) && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return json({ success: true });
  }

  // PATCH /api/admin/services/:id/status
  if (url.pathname.match(/^\/api\/admin\/services\/\d+\/status$/) && request.method === 'PATCH') {
    const id = url.pathname.split('/')[4];
    const { isActive } = await request.json();
    await env.DB.prepare('UPDATE services SET is_active = ? WHERE id = ?').bind(isActive ? 1 : 0, id).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'Admin route not found' }, 404);
}

// ==================== REVIEWS ROUTES ====================
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

  // POST /api/reviews/submit
  if (url.pathname === '/api/reviews/submit' && request.method === 'POST') {
    const { bookingId, providerRating, providerReview, driverRating, driverReview } = await request.json();
    const booking = await env.DB.prepare('SELECT provider_id, driver_id FROM bookings WHERE id = ? AND customer_id = ?').bind(bookingId, user.id).first();
    if (!booking) return json({ success: false, message: 'Booking not found' }, 404);
    
    await env.DB.prepare(
      'INSERT INTO reviews (booking_id, customer_id, provider_id, driver_id, rating, comment, driver_rating, driver_comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(bookingId, user.id, booking.provider_id, booking.driver_id, providerRating, providerReview, driverRating, driverReview).run();
    return json({ success: true });
  }

  return json({ success: false, error: 'Reviews route not found' }, 404);
}

// ==================== LOYALTY ROUTES ====================
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

// ==================== STRIPE ROUTES ====================
async function handleStripe(request, env) {
  const url = new URL(request.url);
  await verifyToken(request, env);

  if (url.pathname === '/api/stripe/account-status' && request.method === 'GET') {
    return json({ success: true, hasAccount: false, onboardingComplete: false });
  }

  return json({ success: false, error: 'Stripe route not found' }, 404);
}

// ==================== CHAT ROUTES ====================
async function handleChat(request, env) {
  const url = new URL(request.url);
  const user = await verifyToken(request, env);

  if (url.pathname === '/api/chat/unread/count' && request.method === 'GET') {
    const count = await env.DB.prepare('SELECT COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND is_read = 0').bind(user.id).first();
    return json({ success: true, count: count?.count || 0 });
  }

  return json({ success: false, error: 'Chat route not found' }, 404);
}

// ==================== DISCOVERY ROUTES ====================
async function handleDiscovery(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/discovery/providers' && request.method === 'GET') {
    const providers = await env.DB.prepare(`
      SELECT id, business_name, phone, email, is_verified, address
      FROM users WHERE role = 'provider' AND is_active = 1
    `).all();
    return json({ success: true, providers: providers.results });
  }

  if (url.pathname === '/api/discovery/drivers' && request.method === 'GET') {
    const drivers = await env.DB.prepare(`
      SELECT id, first_name, last_name, phone, email
      FROM users WHERE role = 'driver' AND is_active = 1
    `).all();
    return json({ success: true, drivers: drivers.results });
  }

  if (url.pathname === '/api/discovery/services' && request.method === 'GET') {
    const services = await env.DB.prepare(`
      SELECT s.*, u.business_name as provider_name 
      FROM services s 
      JOIN users u ON s.provider_id = u.id 
      WHERE s.is_active = 1
    `).all();
    return json({ success: true, services: services.results });
  }

  if (url.pathname === '/api/discovery/stats' && request.method === 'GET') {
    const providers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "provider" AND is_active = 1').first();
    const drivers = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE role = "driver" AND is_active = 1').first();
    const services = await env.DB.prepare('SELECT COUNT(*) as count FROM services WHERE is_active = 1').first();
    return json({ success: true, stats: { providers: providers?.count || 0, drivers: drivers?.count || 0, services: services?.count || 0 } });
  }

  return json({ success: false, error: 'Discovery route not found' }, 404);
}

// ==================== MAIN ROUTER ====================
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
      if (path.startsWith('/api/customer')) return await handleCustomer(request, env);
      if (path.startsWith('/api/services/customer')) return await handleCustomer(request, env);
      if (path.startsWith('/api/payments/customer')) return await handleCustomer(request, env);
      if (path.startsWith('/api/services/provider')) return await handleProvider(request, env);
      if (path.startsWith('/api/payments/provider')) return await handleProvider(request, env);
      if (path.startsWith('/api/provider')) return await handleProvider(request, env);
      if (path.startsWith('/api/driver')) return await handleDriver(request, env);
      if (path.startsWith('/api/admin')) return await handleAdmin(request, env);
      if (path.startsWith('/api/reviews')) return await handleReviews(request, env);
      if (path.startsWith('/api/loyalty')) return await handleLoyalty(request, env);
      if (path.startsWith('/api/stripe')) return await handleStripe(request, env);
      if (path.startsWith('/api/chat')) return await handleChat(request, env);
      if (path.startsWith('/api/discovery')) return await handleDiscovery(request, env);

      return json({ success: false, error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ success: false, error: err.message }, 500);
    }
  },
};

