import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentModal from '../components/PaymentModal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useSocket } from '../hooks/useSocket';
import DiscoveryPage from './DiscoveryPage';
import DriverMap from '../components/DriverMap';
import WhatsAppButton from '../components/WhatsAppButton';
import { StatCard, ModernButton, Badge } from '../components/ModernUI';
import { initializePushNotifications, requestNotificationPermission, sendPushNotification } from '../utils/pushNotifications';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function CustomerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [driverLocations, setDriverLocations] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [driverRating, setDriverRating] = useState(5);
  const [driverReviewText, setDriverReviewText] = useState('');
  
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedBookingForRefund, setSelectedBookingForRefund] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyTier, setLoyaltyTier] = useState('Bronze');

  const [bookingData, setBookingData] = useState({
    date: '', time: '', vehicleId: '', isConcierge: false, pickupAddress: '', notes: ''
  });
  
  const [profile, setProfile] = useState({
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}` : '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: `https://ui-avatars.com/api/?background=8b5cf6&color=fff&name=${user?.firstName || 'User'}`,
    address: user?.address || '',
    memberSince: new Date(user?.createdAt || Date.now()).toLocaleDateString(),
    loyaltyPoints: 1250
  });

  const [editProfileData, setEditProfileData] = useState({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone || '',
    address: profile.address
  });

  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: '', licensePlate: '', color: '' });
  const [filters, setFilters] = useState({ category: 'all', search: '', minPrice: '', maxPrice: '' });

  const token = localStorage.getItem('token');

  const { 
    isConnected,
    subscribeToDriver,
    unsubscribeFromDriver,
    onDriverLiveLocation,
    onBookingStatusChanged,
    onNewNotification,
    joinBookingRoom
  } = useSocket();

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfile(prev => ({
          ...prev,
          fullName: `${data.user.firstName || ''} ${data.user.lastName || ''}`,
          email: data.user.email || prev.email,
          phone: data.user.phone || '',
          address: data.user.address || prev.address
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    const fetchLoyalty = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/loyalty/my-points', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setLoyaltyPoints(data.loyalty.points);
          setLoyaltyTier(data.loyalty.tier);
        }
      } catch (error) {
        console.error('Error fetching loyalty:', error);
      }
    };
    fetchLoyalty();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = onDriverLiveLocation((data) => {
      console.log('📍 Driver location update:', data);
      setDriverLocations(prev => ({
        ...prev,
        [data.driverId]: {
          lat: data.lat,
          lng: data.lng,
          address: data.address || 'En route',
          lastUpdate: new Date()
        }
      }));
    });
    return () => unsubscribe && unsubscribe();
  }, [onDriverLiveLocation]);

  useEffect(() => {
    const unsubscribe = onBookingStatusChanged((data) => {
      console.log('📅 Booking status changed:', data);
      fetchBookings();
      if (data.status === 'confirmed') {
        toast.success(`Booking confirmed!`);
        sendPushNotification('Booking Confirmed', 'Your booking has been confirmed!');
      } else if (data.status === 'in-progress') {
        toast.info(`Service started! Driver is on the way.`);
        sendPushNotification('Service Started', 'Your service has begun!');
      } else if (data.status === 'completed') {
        toast.success(`Service completed!`);
        sendPushNotification('Service Completed', 'Your service is complete!');
      } else if (data.status === 'cancelled') {
        toast.warning(`Booking cancelled`);
      } else if (data.status === 'driver-assigned') {
        toast.info(`A driver has been assigned to your booking!`);
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [onBookingStatusChanged]);

  useEffect(() => {
    const unsubscribe = onNewNotification((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast.info(notification.message);
      sendPushNotification(notification.title || 'Car Care Connect', notification.message);
    });
    return () => unsubscribe && unsubscribe();
  }, [onNewNotification]);

  useEffect(() => {
    bookings.forEach(booking => {
      if (booking.driverId && (booking.status === 'confirmed' || booking.status === 'in-progress' || booking.status === 'driver-assigned')) {
        subscribeToDriver(booking.driverId);
        joinBookingRoom(booking._id);
      }
    });
    return () => {
      bookings.forEach(booking => {
        if (booking.driverId) unsubscribeFromDriver(booking.driverId);
      });
    };
  }, [bookings]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchServices(),
        fetchVehicles(),
        fetchBookings(),
        fetchPaymentHistory(),
        fetchUserProfile()
      ]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      let url = 'http://localhost:5000/api/services';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setServices(data.services || []);
    } catch (error) {
      setServices([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/services/customer/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setVehicles(data.vehicles || []);
    } catch (error) {
      setVehicles([]);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/services/customer/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBookings(data.bookings || []);
    } catch (error) {
      setBookings([]);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('http://localhost:5000/api/payments/customer/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPaymentHistory(data.payments || []);
    } catch (error) {
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const saveProfile = async () => {
    try {
      const nameParts = editProfileData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const res = await fetch('http://localhost:5000/api/customer/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          email: editProfileData.email,
          phone: editProfileData.phone,
          address: editProfileData.address
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Profile saved successfully!');
        setProfile({
          ...profile,
          fullName: editProfileData.fullName,
          email: editProfileData.email,
          phone: editProfileData.phone,
          address: editProfileData.address
        });
        setShowProfileModal(false);
        fetchUserProfile();
      } else {
        toast.error(data.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error('Failed to save profile');
    }
  };

  const submitReview = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: selectedBookingForReview._id,
          providerRating: reviewRating,
          providerReview: reviewText,
          driverRating: selectedBookingForReview.driverId ? driverRating : undefined,
          driverReview: selectedBookingForReview.driverId ? driverReviewText : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Thank you for your review!');
        setShowReviewModal(false);
        setReviewRating(5);
        setReviewText('');
        setDriverRating(5);
        setDriverReviewText('');
        setSelectedBookingForReview(null);
        fetchBookings();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const createBooking = async () => {
    if (!bookingData.date) { toast.error('Select date'); return; }
    if (!bookingData.time) { toast.error('Select time'); return; }
    if (vehicles.length === 0 && !bookingData.vehicleId) {
      toast.error('Add a vehicle first');
      setShowVehicleModal(true);
      return;
    }
    const vehicleId = bookingData.vehicleId || (vehicles[0]?._id);
    if (!vehicleId) { toast.error('Select vehicle'); return; }

    try {
      const payload = {
        serviceId: selectedService._id,
        vehicleId,
        bookingDate: bookingData.date,
        bookingTime: bookingData.time,
        isConcierge: bookingData.isConcierge,
        pickupAddress: bookingData.pickupAddress,
        notes: bookingData.notes
      };
      const res = await fetch('http://localhost:5000/api/services/customer/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Booking created! Awaiting provider confirmation.');
        setPendingBooking(data.booking);
        setShowBookingModal(false);
        setShowPaymentModal(true);
        fetchBookings();
      } else {
        toast.error(data.error || 'Booking failed');
      }
    } catch (error) {
      toast.error('Booking failed');
    }
  };

  const addVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/services/customer/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newVehicle)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Vehicle added!');
        setShowVehicleModal(false);
        setNewVehicle({ make: '', model: '', year: '', licensePlate: '', color: '' });
        fetchVehicles();
      }
    } catch (error) {
      toast.error('Failed to add vehicle');
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (window.confirm('Remove this vehicle?')) {
      try {
        const res = await fetch(`http://localhost:5000/api/services/customer/vehicles/${vehicleId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Vehicle removed');
          fetchVehicles();
        }
      } catch (error) {
        toast.error('Failed to remove vehicle');
      }
    }
  };

  const downloadInvoice = async (bookingId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/invoices/download/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        toast.error('Failed to download');
      }
    } catch (err) {
      toast.error('Error downloading');
    }
  };

  const requestRefund = async () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/refunds/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: selectedBookingForRefund._id,
          reason: refundReason
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Refund request submitted! Admin will review it.');
        setShowRefundModal(false);
        setRefundReason('');
        setSelectedBookingForRefund(null);
      } else {
        toast.error(data.error || 'Failed to submit');
      }
    } catch (error) {
      toast.error('Failed to submit refund request');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'Pending' },
      confirmed: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Confirmed' },
      'in-progress': { bg: '#e0e7ff', color: '#4338ca', icon: '🔧', label: 'In Progress' },
      completed: { bg: '#d1fae5', color: '#065f46', icon: '✔️', label: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', icon: '❌', label: 'Cancelled' },
      'driver-assigned': { bg: '#e0e7ff', color: '#4338ca', icon: '🚗', label: 'Driver Assigned' }
    };
    const c = config[status] || { bg: '#f3f4f6', color: '#6b7280', icon: '📌', label: status };
    return <Badge status={status}>{c.icon} {c.label}</Badge>;
  };

  const totalSpent = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const upcomingBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');

  if (showDiscovery) {
    return <DiscoveryPage user={user} onBack={() => setShowDiscovery(false)} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: '#8b5cf6' },
    { id: 'services', label: 'Services', icon: '🔧', color: '#10b981' },
    { id: 'vehicles', label: 'Vehicles', icon: '🚗', color: '#f59e0b' },
    { id: 'bookings', label: 'Bookings', icon: '📅', color: '#ec4899' },
    { id: 'payments', label: 'Payments', icon: '💰', color: '#22c55e' },
    { id: 'profile', label: 'Profile', icon: '👤', color: '#3b82f6' },
    { id: 'settings', label: 'Settings', icon: '⚙️', color: '#6b7280' }
  ];

  const styles = {
    container: { display: 'flex', minHeight: '100vh', backgroundColor: darkMode ? '#0f172a' : '#f3f4f6' },
    sidebar: {
      width: sidebarCollapsed ? '80px' : '280px',
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      transition: 'width 0.3s ease',
      position: 'fixed', height: '100vh', overflow: 'hidden', zIndex: 100, boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
    },
    sidebarHeader: {
      padding: sidebarCollapsed ? '20px 0' : '24px 24px',
      borderBottom: '1px solid ' + (darkMode ? '#334155' : '#e5e7eb'),
      display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between'
    },
    logoIcon: { fontSize: '28px' },
    logoText: { fontSize: '18px', fontWeight: 'bold', marginLeft: '10px', display: sidebarCollapsed ? 'none' : 'block', color: darkMode ? 'white' : '#1f2937' },
    collapseBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', display: sidebarCollapsed ? 'none' : 'block', color: darkMode ? 'white' : '#6b7280' },
    sidebarMenu: { flex: 1, padding: '20px 0' },
    menuItem: {
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: sidebarCollapsed ? '12px 0' : '12px 24px', margin: '4px 8px', borderRadius: '10px', cursor: 'pointer',
      transition: 'all 0.2s ease', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
      color: darkMode ? '#94a3b8' : '#6b7280'
    },
    menuItemActive: { backgroundColor: darkMode ? '#8b5cf620' : '#8b5cf610', color: '#8b5cf6' },
    menuIcon: { fontSize: '20px' },
    menuLabel: { fontSize: '14px', fontWeight: '500', display: sidebarCollapsed ? 'none' : 'block' },
    mainContent: { flex: 1, marginLeft: sidebarCollapsed ? '80px' : '280px', transition: 'margin-left 0.3s ease' },
    topHeader: {
      backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '16px 30px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid ' + (darkMode ? '#334155' : '#e5e7eb'), position: 'sticky', top: 0, zIndex: 99
    },
    headerTitle: { fontSize: '20px', fontWeight: 'bold', color: darkMode ? 'white' : '#1f2937' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '20px' },
    notificationIcon: { position: 'relative', cursor: 'pointer', fontSize: '22px' },
    notificationBadge: { position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' },
    themeToggle: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : '#f3f4f6' },
    wsBadge: { backgroundColor: isConnected ? '#10b981' : '#ef4444', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' },
    discoveryBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' },
    userName: { fontWeight: '500', color: darkMode ? 'white' : '#374151' },
    logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    contentArea: { padding: '24px 30px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    statIcon: { fontSize: '32px' },
    statInfo: { flex: 1 },
    statValue: { fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' },
    statLabel: { fontSize: '12px', color: '#6b7280' },
    welcomeCard: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '28px',
      borderRadius: '20px',
      color: 'white',
      marginBottom: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
    },
    loyaltyBadge: { backgroundColor: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px', fontSize: '13px' },
    twoColumn: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    card: {
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      padding: '20px',
      borderRadius: '16px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: darkMode ? 'white' : '#374151' },
    filtersBar: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
    filterSelect: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    filterInput: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', flex: 2, backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    filterBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' },
    servicesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
    serviceCard: {
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    serviceName: { fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: darkMode ? 'white' : '#1f2937' },
    providerName: { fontSize: '13px', color: '#8b5cf6', marginBottom: '10px' },
    servicePrice: { display: 'flex', justifyContent: 'space-between', margin: '15px 0' },
    price: { fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' },
    duration: { color: '#6b7280' },
    bookBtn: { width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    vehicleCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '15px', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    addVehicleBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' },
    deleteVehicleBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },
    bookingCard: {
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      padding: '20px',
      borderRadius: '16px',
      marginBottom: '15px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease'
    },
    bookingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
    bookingTitle: { fontSize: '16px', fontWeight: 'bold', color: darkMode ? 'white' : '#1f2937' },
    bookingDetails: { display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280', marginBottom: '15px', flexWrap: 'wrap' },
    invoiceBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', marginRight: '10px' },
    reviewBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', marginLeft: '10px' },
    refundBtn: { backgroundColor: '#f97316', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', marginLeft: '10px' },
    emailBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', marginTop: '10px', marginLeft: '10px' },
    profileContainer: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '30px', borderRadius: '16px' },
    profileAvatar: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'white', margin: '0 auto 20px' },
    profileInfo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' },
    editProfileBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    enableNotificationsBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: darkMode ? '#1e293b' : 'white', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
    modalContentSmall: { backgroundColor: darkMode ? '#1e293b' : 'white', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '90%' },
    input: { width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    textarea: { width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #d1d5db', borderRadius: '8px', minHeight: '80px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '500', color: darkMode ? 'white' : '#374151' },
    modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
    submitBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    cancelBtn: { backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#6b7280' }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚗💨</div>
            <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading your dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" />
      
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={styles.logoIcon}>🚗💨</span>
            <span style={styles.logoText}>Car Care</span>
          </div>
          <button style={styles.collapseBtn} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        <div style={styles.sidebarMenu}>
          {menuItems.map(item => (
            <div
              key={item.id}
              style={{
                ...styles.menuItem,
                ...(activeTab === item.id ? styles.menuItemActive : {}),
                borderLeft: activeTab === item.id ? '3px solid ' + item.color : 'none'
              }}
              onClick={() => setActiveTab(item.id)}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span style={styles.menuLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.topHeader}>
          <div style={styles.headerTitle}>
            {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
          </div>
          <div style={styles.headerRight}>
            <div style={styles.wsBadge}>
              <span style={{ width: '8px', height: '8px', backgroundColor: isConnected ? '#10b981' : '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
              {isConnected ? 'Live' : 'Offline'}
            </div>
            <button style={styles.discoveryBtn} onClick={() => setShowDiscovery(true)}>🔍 Discover</button>
            <div style={styles.notificationIcon} onClick={() => setShowNotifications(!showNotifications)}>
              🔔{unreadCount > 0 && <span style={styles.notificationBadge}>{unreadCount}</span>}
            </div>
            <button style={styles.themeToggle} onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>
                {profile.fullName.charAt(0) || 'U'}
              </div>
              <div>
                <div style={styles.userName}>{profile.fullName}</div>
                <div style={{ fontSize: '11px', color: '#8b5cf6' }}>⭐ {loyaltyPoints} points</div>
              </div>
              <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
            </div>
          </div>
        </div>

        {showNotifications && (
          <div style={{
            position: 'absolute', top: '70px', right: '30px', width: '350px', backgroundColor: 'white',
            borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, maxHeight: '400px', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0 }}>Notifications</h3>
              <button onClick={() => { setNotifications([]); setUnreadCount(0); }} style={{ color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>No notifications</div>
            ) : (
              notifications.map((notif, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px 15px', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '20px' }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{notif.title || 'Update'}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{notif.message}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{new Date(notif.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={styles.contentArea}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}><div style={styles.statIcon}>🚗</div><div style={styles.statInfo}><div style={styles.statValue}>{vehicles.length}</div><div style={styles.statLabel}>Vehicles</div></div></div>
            <div style={styles.statCard}><div style={styles.statIcon}>📅</div><div style={styles.statInfo}><div style={styles.statValue}>{bookings.length}</div><div style={styles.statLabel}>Total Bookings</div></div></div>
            <div style={styles.statCard}><div style={styles.statIcon}>💰</div><div style={styles.statInfo}><div style={styles.statValue}>${totalSpent.toLocaleString()}</div><div style={styles.statLabel}>Total Spent</div></div></div>
            <div style={styles.statCard}><div style={styles.statIcon}>💎</div><div style={styles.statInfo}><div style={styles.statValue}>{loyaltyPoints}</div><div style={styles.statLabel}>Loyalty Points</div><div style={{ fontSize: '11px', color: '#8b5cf6' }}>{loyaltyTier} Tier</div></div></div>
          </div>

          {activeTab === 'dashboard' && (
            <div>
              <div style={styles.welcomeCard}>
                <div><h2 style={{ margin: '0 0 5px 0' }}>Welcome back!</h2><p style={{ margin: 0, opacity: 0.9 }}>Your next service is just a click away</p></div>
                <span style={styles.loyaltyBadge}>⭐ {loyaltyPoints} loyalty points</span>
              </div>
              <div style={styles.twoColumn}>
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardTitle}>📅 Upcoming Appointments</div>
                    {upcomingBookings.length === 0 ? (
                      <div style={styles.emptyState}>No upcoming appointments</div>
                    ) : (
                      upcomingBookings.map(booking => (
                        <div key={booking._id} style={{ padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <div><strong>{booking.serviceName}</strong></div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>{new Date(booking.bookingDate).toLocaleDateString()} at {booking.bookingTime}</div>
                          <div style={{ marginTop: '8px' }}>{getStatusBadge(booking.status)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div style={styles.card}>
                    <div style={styles.cardTitle}>📆 Calendar</div>
                    <Calendar onChange={setSelectedDate} value={selectedDate} />
                  </div>
                  <div style={styles.card}>
                    <div style={styles.cardTitle}>💰 Spending Summary</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Total Spent:</span><strong>${totalSpent.toLocaleString()}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Total Bookings:</span><strong>{bookings.length}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Completed:</span><strong>{bookings.filter(b => b.status === 'completed').length}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div>
              <div style={styles.filtersBar}>
                <select style={styles.filterSelect} value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
                  <option value="all">All Categories</option>
                  <option value="oil-change">Oil Change</option>
                  <option value="brake-repair">Brake Repair</option>
                  <option value="tire-service">Tire Service</option>
                  <option value="engine-repair">Engine Repair</option>
                  <option value="detailing">Detailing</option>
                </select>
                <input style={styles.filterInput} type="text" placeholder="Search services..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
                <button style={styles.filterBtn} onClick={fetchServices}>Apply</button>
              </div>
              <div style={styles.servicesGrid}>
                {services.length === 0 ? (
                  <div style={styles.emptyState}>No services available.</div>
                ) : (
                  services.map(service => (
                    <div key={service._id} style={styles.serviceCard}>
                      <div style={styles.serviceName}>{service.name}</div>
                      <div style={styles.providerName}>🔧 {service.providerBusinessName || service.providerName}</div>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>{service.description?.substring(0, 80)}...</p>
                      <div style={styles.servicePrice}>
                        <span style={styles.price}>${service.price}</span>
                        <span style={styles.duration}>⏱️ {service.duration} min</span>
                      </div>
                      <button style={styles.bookBtn} onClick={() => { setSelectedService(service); setShowBookingModal(true); }}>Book Now →</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div>
              <button style={styles.addVehicleBtn} onClick={() => setShowVehicleModal(true)}>+ Add Vehicle</button>
              {vehicles.length === 0 ? (
                <div style={styles.emptyState}>No vehicles added. Click + Add Vehicle to get started.</div>
              ) : (
                vehicles.map(vehicle => (
                  <div key={vehicle._id} style={styles.vehicleCard}>
                    <div>
                      <strong>{vehicle.year} {vehicle.make} {vehicle.model}</strong>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>License: {vehicle.licensePlate} | Color: {vehicle.color || 'N/A'}</div>
                    </div>
                    <button style={styles.deleteVehicleBtn} onClick={() => deleteVehicle(vehicle._id)}>Remove</button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              {bookings.length === 0 ? (
                <div style={styles.emptyState}>No bookings yet. Browse services to make your first booking!</div>
              ) : (
                bookings.map(booking => (
                  <div key={booking._id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <div>
                        <div style={styles.bookingTitle}>{booking.serviceName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Provider: {booking.providerId?.businessName || booking.providerId?.firstName}</div>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div style={styles.bookingDetails}>
                      <span>📅 {new Date(booking.bookingDate).toLocaleDateString()}</span>
                      <span>⏰ {booking.bookingTime}</span>
                      <span>💰 ${booking.totalAmount}</span>
                      {booking.isConcierge && <span>🚗 Concierge Service</span>}
                    </div>
                    
                    {booking.driverId && driverLocations[booking.driverId] && (booking.status === 'confirmed' || booking.status === 'in-progress' || booking.status === 'driver-assigned') && (
                      <DriverMap 
                        driverLocation={driverLocations[booking.driverId]}
                        pickupLocation={booking.pickupAddress}
                        driverName={booking.driverId?.firstName}
                      />
                    )}
                    
                    {(booking.status === 'completed' || booking.status === 'confirmed') && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                        <button style={styles.invoiceBtn} onClick={() => downloadInvoice(booking._id)}>📄 Download Invoice</button>
                        
                        {booking.status === 'completed' && (
                          <button onClick={() => { setSelectedBookingForReview(booking); setShowReviewModal(true); }} style={styles.reviewBtn}>⭐ Rate Experience</button>
                        )}
                        
                        {booking.status === 'completed' && booking.paymentStatus === 'paid' && (
                          <button onClick={() => { setSelectedBookingForRefund(booking); setShowRefundModal(true); }} style={styles.refundBtn}>🔄 Request Refund</button>
                        )}
                        
                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${booking.providerId?.email}&su=Question about ${booking.serviceName}&body=Hello%20${booking.providerId?.firstName || 'Provider'},%0D%0A%0D%0AI have a question about my booking for ${booking.serviceName} on ${new Date(booking.bookingDate).toLocaleDateString()}.%0D%0A%0D%0AThank you!`} target="_blank" style={styles.emailBtn}>✉️ Message Provider</a>
                        
                        {booking.providerId?.phone && (
                          <WhatsAppButton 
                            phoneNumber={booking.providerId.phone}
                            message={`Hello ${booking.providerId?.firstName || 'Provider'}, I have a question about my booking for ${booking.serviceName} on ${new Date(booking.bookingDate).toLocaleDateString()}. Thank you!`}
                          >
                            💬 WhatsApp Provider
                          </WhatsAppButton>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              {loadingPayments ? (
                <div style={styles.emptyState}>Loading payment history...</div>
              ) : paymentHistory.length === 0 ? (
                <div style={styles.emptyState}>No payment history yet.</div>
              ) : (
                paymentHistory.map(payment => (
                  <div key={payment._id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <div>
                        <div style={styles.bookingTitle}>{payment.bookingId?.serviceName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(payment.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>✅ Paid</span>
                    </div>
                    <div><strong>Amount:</strong> ${payment.amount}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={styles.profileContainer}>
              <div style={styles.profileAvatar}>
                {profile.fullName.charAt(0)}
              </div>
              <div style={styles.profileInfo}>
                <div><strong>Full Name:</strong> {profile.fullName}</div>
                <div><strong>Email:</strong> {profile.email}</div>
                <div><strong>Phone:</strong> {profile.phone || 'Not set'}</div>
                <div><strong>Address:</strong> {profile.address || 'Not set'}</div>
                <div><strong>Member Since:</strong> {profile.memberSince}</div>
                <div><strong>Loyalty Points:</strong> {loyaltyPoints}</div>
                <div><strong>Loyalty Tier:</strong> {loyaltyTier}</div>
              </div>
              <button style={styles.editProfileBtn} onClick={() => { 
                setEditProfileData({ 
                  fullName: profile.fullName, 
                  email: profile.email, 
                  phone: profile.phone || '', 
                  address: profile.address || '' 
                }); 
                setShowProfileModal(true); 
              }}>✏️ Edit Profile</button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>⚙️ Settings</div>
              <div style={{ padding: '10px 0' }}>
                <label style={styles.label}><input type="checkbox" defaultChecked /> Email Notifications</label>
                <label style={styles.label}><input type="checkbox" defaultChecked /> Push Notifications</label>
                <label style={styles.label}><input type="checkbox" /> SMS Notifications</label>
              </div>
              <button style={styles.enableNotificationsBtn} onClick={requestNotificationPermission}>🔔 Enable Push Notifications</button>
              <button style={styles.submitBtn} onClick={() => toast.success('Settings saved!')}>Save Settings</button>
            </div>
          )}
        </div>
      </div>

      {showReviewModal && selectedBookingForReview && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>Rate Your Experience</h2>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Service:</strong> {selectedBookingForReview.serviceName}</p>
              <p><strong>Provider:</strong> {selectedBookingForReview.providerId?.businessName || selectedBookingForReview.providerId?.firstName}</p>
              {selectedBookingForReview.driverId && <p><strong>Driver:</strong> {selectedBookingForReview.driverId?.firstName} {selectedBookingForReview.driverId?.lastName}</p>}
            </div>
            
            <label style={styles.label}>Rate the Provider</label>
            <div style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} onClick={() => setReviewRating(star)} style={{ fontSize: '24px', cursor: 'pointer', color: star <= reviewRating ? '#f59e0b' : '#d1d5db' }}>★</span>
              ))}
            </div>
            <textarea style={styles.textarea} rows="3" placeholder="Share your experience with the provider..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
            
            {selectedBookingForReview.driverId && (
              <>
                <label style={styles.label}>Rate the Driver</label>
                <div style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} onClick={() => setDriverRating(star)} style={{ fontSize: '24px', cursor: 'pointer', color: star <= driverRating ? '#f59e0b' : '#d1d5db' }}>★</span>
                  ))}
                </div>
                <textarea style={styles.textarea} rows="3" placeholder="Share your experience with the driver..." value={driverReviewText} onChange={(e) => setDriverReviewText(e.target.value)} />
              </>
            )}
            
            <div style={styles.modalActions}>
              <button style={styles.submitBtn} onClick={submitReview}>Submit Review</button>
              <button style={styles.cancelBtn} onClick={() => setShowReviewModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && selectedBookingForRefund && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>Request Refund</h2>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Service:</strong> {selectedBookingForRefund.serviceName}</p>
              <p><strong>Amount:</strong> ${selectedBookingForRefund.totalAmount}</p>
              <p><strong>Booking Date:</strong> {new Date(selectedBookingForRefund.bookingDate).toLocaleDateString()}</p>
            </div>
            <label style={styles.label}>Reason for Refund *</label>
            <textarea style={styles.textarea} rows="4" placeholder="Please explain why you are requesting a refund..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            <div style={styles.modalActions}>
              <button style={styles.submitBtn} onClick={requestRefund}>Submit Refund Request</button>
              <button style={styles.cancelBtn} onClick={() => setShowRefundModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBookingModal && selectedService && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>Book {selectedService.name}</h2>
            <p><strong>Provider:</strong> {selectedService.providerBusinessName || selectedService.providerName}</p>
            <p><strong>Price:</strong> ${selectedService.price}</p>
            <label style={styles.label}>Vehicle:</label>
            <select style={styles.input} value={bookingData.vehicleId} onChange={(e) => setBookingData({...bookingData, vehicleId: e.target.value})}>
              <option value="">Select a vehicle</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.year} {v.make} {v.model}</option>)}
            </select>
            <label style={styles.label}>Date:</label>
            <input type="date" style={styles.input} value={bookingData.date} onChange={(e) => setBookingData({...bookingData, date: e.target.value})} min={new Date().toISOString().split('T')[0]} />
            <label style={styles.label}>Time:</label>
            <input type="time" style={styles.input} value={bookingData.time} onChange={(e) => setBookingData({...bookingData, time: e.target.value})} />
            <label style={styles.label}>
              <input type="checkbox" checked={bookingData.isConcierge} onChange={(e) => setBookingData({...bookingData, isConcierge: e.target.checked})} /> 🚗 Concierge Service (+$20)
            </label>
            {bookingData.isConcierge && (
              <>
                <label style={styles.label}>Pickup Address:</label>
                <textarea style={styles.textarea} value={bookingData.pickupAddress} onChange={(e) => setBookingData({...bookingData, pickupAddress: e.target.value})} placeholder="Enter your pickup address" required />
              </>
            )}
            <div style={styles.modalActions}>
              <button style={styles.submitBtn} onClick={createBooking}>Continue to Payment</button>
              <button style={styles.cancelBtn} onClick={() => { setShowBookingModal(false); setSelectedService(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && pendingBooking && (
        <Elements stripe={stripePromise}>
          <PaymentModal 
            booking={pendingBooking} 
            amount={pendingBooking.totalAmount} 
            onSuccess={() => { setShowPaymentModal(false); toast.success('Booking confirmed!'); fetchAllData(); }} 
            onCancel={() => { setShowPaymentModal(false); fetchAllData(); }} 
          />
        </Elements>
      )}

      {showProfileModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>Edit Profile</h2>
            <input 
              style={styles.input} 
              type="text" 
              placeholder="Full Name" 
              value={editProfileData.fullName} 
              onChange={(e) => setEditProfileData({...editProfileData, fullName: e.target.value})} 
            />
            <input 
              style={styles.input} 
              type="email" 
              placeholder="Email" 
              value={editProfileData.email} 
              onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})} 
            />
            <input 
              style={styles.input} 
              type="tel" 
              placeholder="Phone Number" 
              value={editProfileData.phone} 
              onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})} 
            />
            <input 
              style={styles.input} 
              type="text" 
              placeholder="Address" 
              value={editProfileData.address} 
              onChange={(e) => setEditProfileData({...editProfileData, address: e.target.value})} 
            />
            <div style={styles.modalActions}>
              <button style={styles.submitBtn} onClick={saveProfile}>Save Changes</button>
              <button style={styles.cancelBtn} onClick={() => setShowProfileModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showVehicleModal && (
        <div style={styles.modal}>
          <div style={styles.modalContentSmall}>
            <h2 style={{ marginBottom: '20px' }}>Add Vehicle</h2>
            <form onSubmit={addVehicle}>
              <input style={styles.input} type="text" placeholder="Make" value={newVehicle.make} onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="Model" value={newVehicle.model} onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})} required />
              <input style={styles.input} type="number" placeholder="Year" value={newVehicle.year} onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="License Plate" value={newVehicle.licensePlate} onChange={(e) => setNewVehicle({...newVehicle, licensePlate: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="Color" value={newVehicle.color} onChange={(e) => setNewVehicle({...newVehicle, color: e.target.value})} />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.submitBtn}>Save</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowVehicleModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDashboard;
