import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSocket } from '../hooks/useSocket';
import { useRealtime } from '../hooks/useRealtime';
import WhatsAppButton from '../components/WhatsAppButton';
import { StatCard, ModernButton, Badge } from '../components/ModernUI';
import { initializePushNotifications, requestNotificationPermission, sendPushNotification } from '../utils/pushNotifications';

function ProviderDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState({ totalRevenue: 0, totalEarnings: 0, platformFees: 0, totalBookings: 0 });
  const [pendingPayout, setPendingPayout] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [pendingPayoutAmount, setPendingPayoutAmount] = useState(0);
  const [pendingPayoutCount, setPendingPayoutCount] = useState(0);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({ hasAccount: false, status: null, onboardingComplete: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newBookingAlert, setNewBookingAlert] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReviewForReply, setSelectedReviewForReply] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const [bankAccount, setBankAccount] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    routingNumber: ''
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    autoConfirm: false,
    priceAlerts: true,
    calendarSync: false,
    language: 'english'
  });

  const [businessProfile, setBusinessProfile] = useState({
    businessName: user?.businessName || '',
    ownerName: `${user?.firstName || ''} ${user?.lastName || ''}`,
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.businessAddress || '',
    taxId: user?.businessLicense || '',
    logo: user?.profilePicture || `https://ui-avatars.com/api/?background=8b5cf6&color=fff&name=${user?.businessName?.charAt(0) || 'P'}`
  });

  const [editProfileData, setEditProfileData] = useState({
    businessName: businessProfile.businessName,
    ownerName: businessProfile.ownerName,
    email: businessProfile.email,
    phone: businessProfile.phone || '',
    address: businessProfile.address,
    taxId: businessProfile.taxId
  });

  const [serviceForm, setServiceForm] = useState({
    name: '', description: '', category: 'oil-change', price: '', duration: '30',
    discountedPrice: '', warranty: '', tags: '', requirements: '', inclusions: ''
  });

  const categories = [
    { id: 'oil-change', name: 'Oil Change', icon: '🛢️' },
    { id: 'brake-repair', name: 'Brake Repair', icon: '🛑' },
    { id: 'tire-service', name: 'Tire Service', icon: '🛞' },
    { id: 'engine-repair', name: 'Engine Repair', icon: '🔧' },
    { id: 'ac-repair', name: 'AC Repair', icon: '❄️' },
    { id: 'transmission', name: 'Transmission', icon: '⚙️' },
    { id: 'detailing', name: 'Detailing', icon: '🧼' },
    { id: 'maintenance', name: 'Maintenance', icon: '📋' },
    { id: 'electrical', name: 'Electrical', icon: '⚡' },
    { id: 'body-repair', name: 'Body Repair', icon: '🚘' }
  ];

  const token = localStorage.getItem('token');
  const providerId = user?._id;

  // Real-time WebSocket connection for provider
  const { isConnected: wsConnected, updateBookingStatus: realtimeUpdateStatus } = useRealtime('provider', providerId);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setBusinessProfile(prev => ({
          ...prev,
          businessName: data.user.businessName || prev.businessName,
          email: data.user.email || prev.email,
          phone: data.user.phone || '',
          address: data.user.businessAddress || prev.address,
          taxId: data.user.businessLicense || prev.taxId
        }));
        setEditProfileData(prev => ({
          ...prev,
          businessName: data.user.businessName || prev.businessName,
          email: data.user.email || prev.email,
          phone: data.user.phone || '',
          address: data.user.businessAddress || prev.address,
          taxId: data.user.businessLicense || prev.taxId
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const { 
    isConnected,
    updateBookingStatus,
    onBookingStatusChanged,
    onNewNotification,
    joinBookingRoom
  } = useSocket();

  useEffect(() => {
    initializePushNotifications();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/chat/unread/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setUnreadChatCount(data.count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onBookingStatusChanged((data) => {
      fetchBookings();
      fetchEarnings();
      if (data.status === 'confirmed') {
        toast.success(`Booking confirmed!`);
        sendPushNotification('Booking Confirmed', 'You have a new confirmed booking!');
      } else if (data.status === 'cancelled') {
        toast.warning(`Booking cancelled`);
      } else if (data.status === 'completed') {
        toast.success(`Booking completed!`);
        sendPushNotification('Booking Completed', 'A service has been completed!');
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [onBookingStatusChanged]);

  useEffect(() => {
    const unsubscribe = onNewNotification((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      sendPushNotification(notification.title || 'Car Care Connect', notification.message);
      if (notification.type === 'new_booking') {
        setNewBookingAlert(notification);
        toast.info(`🔔 NEW BOOKING: ${notification.data?.serviceName || 'New service booked'}!`, { onClick: () => setActiveTab('bookings'), autoClose: 10000 });
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [onNewNotification]);

  useEffect(() => {
    bookings.forEach(booking => {
      if (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'in-progress') {
        joinBookingRoom(booking._id);
      }
    });
  }, [bookings, joinBookingRoom]);

  useEffect(() => {
    fetchAllData();
    fetchBankAccount();
    checkStripeStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchProviderReviews();
    }
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchServices(), fetchBookings(), fetchEarnings(), fetchPayoutHistory()]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/reviews/my-reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews);
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/services/provider/my-services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setServices(data.services || []);
    } catch (error) { setServices([]); }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/services/provider/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBookings(data.bookings || []);
    } catch (error) { setBookings([]); }
  };

  const fetchEarnings = async () => {
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/payments/provider/earnings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEarnings(data.earnings || { totalRevenue: 0, totalEarnings: 0, platformFees: 0, totalBookings: 0 });
        setPendingPayout(data.pendingPayout || 0);
        setRecentPayments(data.recentPayments || []);
      }
    } catch (error) { console.error(error); }
  };

  const fetchPayoutHistory = async () => {
    setLoadingPayouts(true);
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/payments/provider/payout-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPayoutHistory(data.payoutHistory || []);
        setPendingPayoutAmount(data.pendingAmount || 0);
        setPendingPayoutCount(data.pendingCount || 0);
      }
    } catch (error) { console.error(error); }
    finally { setLoadingPayouts(false); }
  };

  const fetchBankAccount = async () => {
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/provider/bank-account', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.bankAccount) {
        setBankAccount(data.bankAccount);
        setHasBankAccount(true);
      }
    } catch (error) { console.error(error); }
  };

  const saveBankAccount = async (e) => {
    e.preventDefault();
    setLoadingBank(true);
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/provider/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bankAccount)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Bank account saved!');
        setHasBankAccount(true);
        setShowBankModal(false);
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) { toast.error('Failed to save'); }
    finally { setLoadingBank(false); }
  };

  const deleteBankAccount = async () => {
    if (window.confirm('Remove bank account?')) {
      try {
        const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/provider/bank-account', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Bank account removed');
          setHasBankAccount(false);
          setBankAccount({ accountName: '', accountNumber: '', bankName: '', routingNumber: '' });
        }
      } catch (error) { toast.error('Failed to remove'); }
    }
  };

  const checkStripeStatus = async () => {
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/stripe/account-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStripeStatus(data);
    } catch (error) { console.error(error); }
  };

  const connectStripe = async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/stripe/onboarding-link', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.url) window.location.href = data.url;
      else toast.error('Failed to create Stripe link');
    } catch (error) { toast.error('Failed to connect Stripe'); }
    finally { setLoadingStripe(false); }
  };

  const disconnectStripe = async () => {
    if (window.confirm('Disconnect Stripe?')) {
      try {
        const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/stripe/disconnect', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Stripe disconnected');
          checkStripeStatus();
        }
      } catch (error) { toast.error('Failed to disconnect'); }
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/provider/business-profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          businessName: editProfileData.businessName,
          phone: editProfileData.phone,
          address: editProfileData.address,
          businessLicense: editProfileData.taxId
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated successfully!');
        setBusinessProfile({
          ...businessProfile,
          businessName: editProfileData.businessName,
          phone: editProfileData.phone,
          address: editProfileData.address,
          taxId: editProfileData.taxId
        });
        setShowEditProfileModal(false);
        fetchUserProfile();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...serviceForm,
        price: parseFloat(serviceForm.price),
        duration: parseInt(serviceForm.duration),
        discountedPrice: serviceForm.discountedPrice ? parseFloat(serviceForm.discountedPrice) : undefined,
        tags: serviceForm.tags.split(',').map(t => t.trim()),
        requirements: serviceForm.requirements.split(',').map(r => r.trim()),
        inclusions: serviceForm.inclusions.split(',').map(i => i.trim())
      };

      let url = 'https://carcare-api.brianbakari22.workers.dev/api/services';
      let method = 'POST';
      if (editingService) {
        url = `https://carcare-api.brianbakari22.workers.dev/api/services/${editingService._id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingService ? 'Service updated!' : 'Service added!');
        setShowServiceModal(false);
        setEditingService(null);
        setServiceForm({ name: '', description: '', category: 'oil-change', price: '', duration: '30', discountedPrice: '', warranty: '', tags: '', requirements: '', inclusions: '' });
        fetchServices();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) { toast.error('Failed to save service'); }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Delete this service?')) {
      try {
        const res = await fetch(`https://carcare-api.brianbakari22.workers.dev/api/services/${serviceId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Service deleted!');
          fetchServices();
        }
      } catch (error) { toast.error('Failed to delete'); }
    }
  };

  const handleToggleStatus = async (serviceId) => {
    try {
      const res = await fetch(`https://carcare-api.brianbakari22.workers.dev/api/services/${serviceId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Service ${data.service.isActive ? 'activated' : 'deactivated'}`);
        fetchServices();
      }
    } catch (error) { toast.error('Failed to update'); }
  };

  const editService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price,
      duration: service.duration,
      discountedPrice: service.discountedPrice || '',
      warranty: service.warranty || '',
      tags: (service.tags || []).join(', '),
      requirements: (service.requirements || []).join(', '),
      inclusions: (service.inclusions || []).join(', ')
    });
    setShowServiceModal(true);
  };

  const handleUpdateBookingStatus = async (bookingId, status, customerId) => {
    try {
      // Update via both WebSocket and Cloudflare real-time
      updateBookingStatus(bookingId, status);
      realtimeUpdateStatus(bookingId, status, customerId);
      
      const res = await fetch(`https://carcare-api.brianbakari22.workers.dev/api/services/provider/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Booking ${status}!`);
        fetchBookings();
        fetchEarnings();
      }
    } catch (error) { toast.error('Failed to update booking'); }
  };

  const requestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    if (parseFloat(payoutAmount) > pendingPayoutAmount) {
      toast.error('Amount exceeds balance');
      return;
    }
    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/payments/provider/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(payoutAmount) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payout requested!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        fetchEarnings();
        fetchPayoutHistory();
      } else {
        toast.error(data.error);
      }
    } catch (error) { toast.error('Failed to request'); }
  };

  const downloadInvoice = async (paymentId) => {
    try {
      const res = await fetch(`https://carcare-api.brianbakari22.workers.dev/api/invoices/download/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
        toast.success('Invoice opened');
      } else {
        toast.error('Failed to download');
      }
    } catch (err) { toast.error('Error downloading'); }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: '#fef3c7', color: '#92400e', icon: '⏳', label: 'Pending' },
      confirmed: { bg: '#d1fae5', color: '#065f46', icon: '✅', label: 'Confirmed' },
      'in-progress': { bg: '#e0e7ff', color: '#4338ca', icon: '🔧', label: 'In Progress' },
      completed: { bg: '#d1fae5', color: '#065f46', icon: '✔️', label: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', icon: '❌', label: 'Cancelled' }
    };
    const c = config[status] || { bg: '#f3f4f6', color: '#6b7280', icon: '📌', label: status };
    return <Badge status={status}>{c.icon} {c.label}</Badge>;
  };

  const totalRevenue = earnings.totalRevenue || 0;
  const yourEarnings = earnings.totalEarnings || 0;
  const platformFees = earnings.platformFees || 0;
  const completedBookings = earnings.totalBookings || 0;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const firstPaymentId = recentPayments.length > 0 ? recentPayments[0]._id : null;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: '#8b5cf6' },
    { id: 'services', label: 'Services', icon: '🛠️', color: '#10b981' },
    { id: 'bookings', label: 'Bookings', icon: '📅', color: '#ec4899' },
    { id: 'earnings', label: 'Earnings', icon: '💰', color: '#22c55e' },
    { id: 'reviews', label: 'Reviews', icon: '⭐', color: '#f59e0b' },
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
    collapseBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', display: sidebarCollapsed ? 'none' : 'block' },
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
    wsBadge: { backgroundColor: isConnected && wsConnected ? '#10b981' : '#ef4444', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' },
    userName: { fontWeight: '500', color: darkMode ? 'white' : '#374151' },
    logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    emailBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', marginTop: '10px', marginRight: '10px' },
    contentArea: { padding: '24px 30px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '16px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    statValue: { fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', margin: '8px 0' },
    statLabel: { fontSize: '12px', color: '#6b7280' },
    payoutBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginTop: '5px' },
    twoColumn: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    card: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: darkMode ? 'white' : '#374151' },
    activityItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #e5e7eb' },
    paymentItem: { display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #e5e7eb', alignItems: 'center', flexWrap: 'wrap' },
    actionBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' },
    addBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' },
    servicesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
    serviceCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    serviceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    serviceName: { fontSize: '18px', fontWeight: 'bold', color: darkMode ? 'white' : '#1f2937' },
    serviceDesc: { color: '#6b7280', fontSize: '13px', marginBottom: '12px' },
    serviceDetails: { display: 'flex', gap: '15px', fontSize: '12px', color: '#374151', marginBottom: '10px', flexWrap: 'wrap' },
    serviceStats: { display: 'flex', gap: '15px', fontSize: '11px', color: '#6b7280', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb' },
    serviceActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    editBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    toggleBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    deleteBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    bookingCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    bookingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap' },
    bookingDetails: { display: 'flex', gap: '20px', fontSize: '13px', color: '#6b7280', marginBottom: '15px', flexWrap: 'wrap' },
    bookingActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    confirmBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' },
    rejectBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' },
    startBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    completeBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    earningsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
    earningsCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', textAlign: 'center' },
    pendingCard: { backgroundColor: '#fef3c7', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    pendingAmount: { fontSize: '28px', fontWeight: 'bold', color: '#f59e0b', display: 'block' },
    payoutBtnLarge: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    invoiceBanner: { backgroundColor: '#d1fae5', padding: '15px', borderRadius: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    payoutItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '10px' },
    smallInvoiceBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },
    profileContainer: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '30px', borderRadius: '16px' },
    profileAvatar: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'white', margin: '0 auto 20px' },
    profileInfo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' },
    editProfileBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    enableNotificationsBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' },
    bankSection: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' },
    bankCard: { backgroundColor: '#f9fafb', padding: '15px', borderRadius: '12px', marginBottom: '10px' },
    editBankBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '10px' },
    deleteBankBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' },
    noBankCard: { backgroundColor: '#fef3c7', padding: '20px', borderRadius: '16px', textAlign: 'center' },
    addBankBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    stripeSection: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' },
    stripeCard: { backgroundColor: '#e0e7ff', padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' },
    stripeSuccessCard: { backgroundColor: '#d1fae5', padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' },
    stripePendingCard: { backgroundColor: '#fef3c7', padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' },
    connectStripeBtn: { backgroundColor: '#635bff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' },
    disconnectStripeBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', fontSize: '12px' },
    settingsContainer: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '30px', borderRadius: '16px' },
    settingsSection: { marginBottom: '30px' },
    saveSettingsBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: darkMode ? '#1e293b' : 'white', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
    modalContentSmall: { backgroundColor: darkMode ? '#1e293b' : 'white', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '90%' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    textarea: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', minHeight: '80px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
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
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔧</div>
            <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading dashboard...</div>
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
            <span style={styles.logoIcon}>🔧</span>
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
              <span style={{ width: '8px', height: '8px', backgroundColor: isConnected && wsConnected ? '#10b981' : '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
              {isConnected && wsConnected ? 'Live' : 'Offline'}
            </div>
            {newBookingAlert && <span style={{ backgroundColor: '#ef4444', padding: '4px 8px', borderRadius: '20px', fontSize: '10px', color: 'white' }}>🔔 New Booking!</span>}
            <div style={styles.notificationIcon} onClick={() => setShowNotifications(!showNotifications)}>
              🔔{unreadCount > 0 && <span style={styles.notificationBadge}>{unreadCount}</span>}
            </div>
            <button style={styles.themeToggle} onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{businessProfile.businessName?.charAt(0) || 'P'}</div>
              <div>
                <div style={styles.userName}>{businessProfile.businessName || user?.firstName}</div>
                <div style={{ fontSize: '11px', color: '#8b5cf6' }}>Provider</div>
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
            <div style={styles.statCard}><div style={styles.statValue}>${totalRevenue.toLocaleString()}</div><div style={styles.statLabel}>Total Revenue</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>${yourEarnings.toLocaleString()}</div><div style={styles.statLabel}>Your Earnings</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>${platformFees.toLocaleString()}</div><div style={styles.statLabel}>Platform Fee</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>{completedBookings}</div><div style={styles.statLabel}>Completed</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>{pendingBookings}</div><div style={styles.statLabel}>Pending Bookings</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>${pendingPayoutAmount.toLocaleString()}<button style={styles.payoutBtn} onClick={() => setShowPayoutModal(true)}>Request</button></div><div style={styles.statLabel}>Pending Payout</div></div>
          </div>

          <div style={styles.quickStats} style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={styles.quickStat}><span>🌐</span> Real-time: {wsConnected ? '✅ Connected' : '❌ Connecting...'}</div>
          </div>

          {activeTab === 'dashboard' && (
            <div style={styles.twoColumn}>
              <div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>📈 Recent Activity</div>
                  {bookings.slice(0, 5).map(booking => (
                    <div key={booking._id} style={styles.activityItem}>
                      <span>{booking.serviceName} - {booking.customerId?.firstName}</span>
                      {getStatusBadge(booking.status)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>💰 Recent Payments</div>
                  {recentPayments.map(payment => (
                    <div key={payment._id} style={styles.paymentItem}>
                      <span>{payment.bookingId?.serviceName}</span>
                      <span>${payment.amount}</span>
                      <span style={{ color: '#10b981' }}>+${payment.providerEarnings}</span>
                      <button onClick={() => downloadInvoice(payment._id)} style={styles.smallInvoiceBtn}>📄 Invoice</button>
                    </div>
                  ))}
                </div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>📦 Quick Actions</div>
                  <button style={styles.actionBtn} onClick={() => setActiveTab('services')}>➕ Add Service</button>
                  <button style={styles.actionBtn} onClick={() => setActiveTab('bookings')}>📅 View Bookings</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div>
              <button style={styles.addBtn} onClick={() => { setEditingService(null); setServiceForm({ name: '', description: '', category: 'oil-change', price: '', duration: '30', discountedPrice: '', warranty: '', tags: '', requirements: '', inclusions: '' }); setShowServiceModal(true); }}>+ Add Service</button>
              <div style={styles.servicesGrid}>
                {services.map(service => {
                  const serviceBookings = bookings.filter(b => b.serviceId === service._id);
                  const serviceRevenue = serviceBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                  return (
                    <div key={service._id} style={styles.serviceCard}>
                      <div style={styles.serviceHeader}>
                        <div style={styles.serviceName}>{service.name}</div>
                        <span style={{ backgroundColor: service.isActive ? '#d1fae5' : '#fee2e2', color: service.isActive ? '#065f46' : '#991b1b', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p style={styles.serviceDesc}>{service.description?.substring(0, 80)}...</p>
                      <div style={styles.serviceDetails}>
                        <span>{categories.find(c => c.id === service.category)?.icon} {service.category}</span>
                        <span>💰 ${service.price}</span>
                        <span>⏱️ {service.duration} min</span>
                      </div>
                      <div style={styles.serviceStats}>
                        <span>📊 {serviceBookings.length} bookings</span>
                        <span>💰 ${serviceRevenue} revenue</span>
                      </div>
                      <div style={styles.serviceActions}>
                        <button style={styles.editBtn} onClick={() => editService(service)}>✏️ Edit</button>
                        <button style={styles.toggleBtn} onClick={() => handleToggleStatus(service._id)}>{service.isActive ? '🔴 Deactivate' : '🟢 Activate'}</button>
                        <button style={styles.deleteBtn} onClick={() => handleDeleteService(service._id)}>🗑️ Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              {bookings.map(booking => (
                <div key={booking._id} style={styles.bookingCard}>
                  <div style={styles.bookingHeader}>
                    <div>
                      <div style={styles.serviceName}>{booking.serviceName}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Customer: {booking.customerId?.firstName} {booking.customerId?.lastName}</div>
                      <div style={{ fontSize: '12px', color: '#8b5cf6' }}>📞 {booking.customerId?.phone}</div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div style={styles.bookingDetails}>
                    <span>📅 {new Date(booking.bookingDate).toLocaleDateString()}</span>
                    <span>⏰ {booking.bookingTime}</span>
                    <span>💰 ${booking.totalAmount}</span>
                    {booking.isConcierge && <span>🚗 Concierge</span>}
                  </div>
                  {booking.status === 'pending' && (
                    <div style={styles.bookingActions}>
                      <button style={styles.confirmBtn} onClick={() => handleUpdateBookingStatus(booking._id, 'confirmed', booking.customerId?._id)}>✓ Confirm</button>
                      <button style={styles.rejectBtn} onClick={() => handleUpdateBookingStatus(booking._id, 'cancelled', booking.customerId?._id)}>✗ Reject</button>
                    </div>
                  )}
                  {booking.status === 'confirmed' && (
                    <button style={styles.startBtn} onClick={() => handleUpdateBookingStatus(booking._id, 'in-progress', booking.customerId?._id)}>▶ Start Service</button>
                  )}
                  {booking.status === 'in-progress' && (
                    <button style={styles.completeBtn} onClick={() => handleUpdateBookingStatus(booking._id, 'completed', booking.customerId?._id)}>✅ Complete</button>
                  )}
                  <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${booking.customerId?.email}&su=Regarding your booking for ${booking.serviceName}&body=Hello%20${booking.customerId?.firstName},%0D%0A%0D%0AThank you for your booking. I wanted to follow up regarding your ${booking.serviceName} scheduled for ${new Date(booking.bookingDate).toLocaleDateString()}.%0D%0A%0D%0APlease let me know if you have any questions.%0D%0A%0D%0ABest regards,%0D%0A${user?.businessName || user?.firstName}`} target="_blank" style={styles.emailBtn}>✉️ Message Customer</a>
                  
                  {booking.customerId?.phone && (
                    <WhatsAppButton 
                      phoneNumber={booking.customerId.phone}
                      message={`Hello ${booking.customerId?.firstName}, Thank you for your booking for ${booking.serviceName} on ${new Date(booking.bookingDate).toLocaleDateString()}. Please let me know if you have any questions. Best regards, ${user?.businessName || user?.firstName}`}
                    >
                      💬 WhatsApp Customer
                    </WhatsAppButton>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div>
              {yourEarnings > 0 && firstPaymentId && (
                <div style={styles.invoiceBanner}>
                  <div><strong>📄 Your Invoice is Ready!</strong><div style={{ fontSize: '12px', color: '#065f46' }}>Download your payment invoice</div></div>
                  <button onClick={() => downloadInvoice(firstPaymentId)} style={styles.payoutBtnLarge}>📄 Download Invoice (${yourEarnings})</button>
                </div>
              )}
              <div style={styles.earningsGrid}>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div><div>Total Revenue</div><div style={styles.statValue}>${totalRevenue.toLocaleString()}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>From {completedBookings} bookings</div></div>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px', marginBottom: '8px' }}>💵</div><div>Your Earnings</div><div style={{ ...styles.statValue, color: '#10b981' }}>${yourEarnings.toLocaleString()}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>70% of revenue</div></div>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div><div>Platform Fee</div><div style={{ ...styles.statValue, color: '#f59e0b' }}>${platformFees.toLocaleString()}</div><div style={{ fontSize: '11px', color: '#6b7280' }}>15% commission</div></div>
              </div>
              <div style={styles.pendingCard}>
                <div><span style={styles.pendingAmount}>${pendingPayoutAmount.toLocaleString()}</span><span>pending for {pendingPayoutCount} booking{pendingPayoutCount !== 1 ? 's' : ''}</span></div>
                <button style={styles.payoutBtnLarge} onClick={() => setShowPayoutModal(true)}>Request Payout</button>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}>📋 Payout History</div>
                {loadingPayouts ? <div>Loading...</div> : payoutHistory.map(payout => (
                  <div key={payout._id} style={styles.payoutItem}>
                    <div><strong>{payout._id}</strong><div style={{ fontSize: '11px', color: '#6b7280' }}>{new Date(payout.date).toLocaleDateString()}</div></div>
                    <div><span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>${payout.amount.toLocaleString()}</span><div style={{ fontSize: '11px', color: '#6b7280' }}>{payout.count} bookings</div></div>
                    <button onClick={() => downloadInvoice(payout._id)} style={styles.smallInvoiceBtn}>📄 Invoice</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={styles.profileContainer}>
              <div style={styles.profileAvatar}>{businessProfile.businessName?.charAt(0) || 'P'}</div>
              <div style={styles.profileInfo}>
                <div><strong>Business Name:</strong> {businessProfile.businessName}</div>
                <div><strong>Owner:</strong> {businessProfile.ownerName}</div>
                <div><strong>Email:</strong> {businessProfile.email}</div>
                <div><strong>Phone:</strong> {businessProfile.phone || 'Not set'}</div>
                <div><strong>Address:</strong> {businessProfile.address || 'Not set'}</div>
                <div><strong>Tax ID:</strong> {businessProfile.taxId || 'Not set'}</div>
              </div>
              <button style={styles.editProfileBtn} onClick={() => { 
                setEditProfileData({ 
                  businessName: businessProfile.businessName, 
                  email: businessProfile.email, 
                  phone: businessProfile.phone || '', 
                  address: businessProfile.address || '', 
                  taxId: businessProfile.taxId || '' 
                }); 
                setShowEditProfileModal(true); 
              }}>✏️ Edit Profile</button>
              
              <div style={styles.bankSection}>
                <div style={styles.cardTitle}>🏦 Payout Information</div>
                {hasBankAccount ? (
                  <div style={styles.bankCard}>
                    <div><strong>Account Holder:</strong> {bankAccount.accountName}</div>
                    <div><strong>Account Number:</strong> ••••{bankAccount.accountNumber?.slice(-4)}</div>
                    <div><strong>Bank Name:</strong> {bankAccount.bankName}</div>
                    <button style={styles.editBankBtn} onClick={() => setShowBankModal(true)}>Update</button>
                    <button style={styles.deleteBankBtn} onClick={deleteBankAccount}>Remove</button>
                  </div>
                ) : (
                  <div style={styles.noBankCard}>
                    <button style={styles.addBankBtn} onClick={() => setShowBankModal(true)}>+ Add Bank Account</button>
                  </div>
                )}
              </div>
              
              <div style={styles.stripeSection}>
                <div style={styles.cardTitle}>💳 Automatic Payouts (Stripe Connect)</div>
                {stripeStatus?.onboardingComplete ? (
                  <div style={styles.stripeSuccessCard}><span>✅</span><div><strong>Stripe Connected!</strong><p>Your account is ready to receive automatic payouts.</p><button onClick={disconnectStripe} style={styles.disconnectStripeBtn}>Disconnect Stripe</button></div></div>
                ) : stripeStatus?.hasAccount ? (
                  <div style={styles.stripePendingCard}><span>⏳</span><div><strong>Stripe Account Pending</strong><p>Please complete the onboarding process.</p><button onClick={connectStripe} disabled={loadingStripe} style={styles.connectStripeBtn}>{loadingStripe ? 'Redirecting...' : 'Complete Setup →'}</button></div></div>
                ) : (
                  <div style={styles.stripeCard}><span>💰</span><div><strong>Get Paid Automatically</strong><p>Connect your Stripe account to receive automatic payouts.</p><button onClick={connectStripe} disabled={loadingStripe} style={styles.connectStripeBtn}>{loadingStripe ? 'Redirecting...' : 'Connect Stripe Account →'}</button></div></div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={styles.settingsContainer}>
              <div style={styles.cardTitle}>⚙️ Settings</div>
              <div style={styles.settingsSection}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🔔 Notification Preferences</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} /> Email
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" checked={settings.pushNotifications} onChange={(e) => setSettings({...settings, pushNotifications: e.target.checked})} /> Push
                </label>
              </div>
              <button style={styles.enableNotificationsBtn} onClick={requestNotificationPermission}>🔔 Enable Push Notifications</button>
              <button style={styles.saveSettingsBtn} onClick={() => toast.success('Settings saved!')}>Save Settings</button>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>⭐ Customer Reviews</div>
              {reviewsLoading ? (
                <div>Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div style={styles.emptyState}>No reviews yet. Complete services to get customer feedback.</div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                    <div><strong>Average Rating:</strong> ⭐ {averageRating} / 5</div>
                    <div><strong>Total Reviews:</strong> {totalReviews}</div>
                  </div>
                  {reviews.map(review => (
                    <div key={review._id} style={{ borderBottom: '1px solid #e5e7eb', padding: '15px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong>{review.customerId?.firstName} {review.customerId?.lastName}</strong>
                          <div style={{ color: '#f59e0b', margin: '5px 0' }}>
                            {'★'.repeat(review.providerRating)}{'☆'.repeat(5 - review.providerRating)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(review.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', maxWidth: '500px' }}>{review.providerReview}</div>
                        {!review.providerResponse && (
                          <button 
                            onClick={() => {
                              setSelectedReviewForReply(review);
                              setShowReplyModal(true);
                            }} 
                            style={{ backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Reply
                          </button>
                        )}
                      </div>
                      {review.providerResponse && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f3e8ff', borderRadius: '8px' }}>
                          <strong>Your Response:</strong>
                          <div>{review.providerResponse}</div>
                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{new Date(review.providerResponseAt).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showServiceModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>{editingService ? 'Edit Service' : 'Add Service'}</h2>
            <form onSubmit={handleServiceSubmit}>
              <input style={styles.input} placeholder="Service Name" value={serviceForm.name} onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})} required />
              <textarea style={styles.textarea} placeholder="Description" value={serviceForm.description} onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})} required />
              <select style={styles.input} value={serviceForm.category} onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="Price ($)" value={serviceForm.price} onChange={(e) => setServiceForm({...serviceForm, price: e.target.value})} required />
              <input style={styles.input} type="number" placeholder="Duration (minutes)" value={serviceForm.duration} onChange={(e) => setServiceForm({...serviceForm, duration: e.target.value})} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.submitBtn}>Save</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowServiceModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayoutModal && (
        <div style={styles.modal}>
          <div style={styles.modalContentSmall}>
            <h2 style={{ marginBottom: '20px' }}>Request Payout</h2>
            <p>Available: <strong>${pendingPayoutAmount}</strong></p>
            <input type="number" style={styles.input} placeholder="Amount" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
            <div style={styles.modalActions}>
              <button onClick={requestPayout} style={styles.submitBtn}>Submit</button>
              <button onClick={() => setShowPayoutModal(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEditProfileModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>Edit Profile</h2>
            <form onSubmit={updateProfile}>
              <input style={styles.input} type="text" placeholder="Business Name" value={editProfileData.businessName} onChange={(e) => setEditProfileData({...editProfileData, businessName: e.target.value})} required />
              <input style={styles.input} type="tel" placeholder="Phone Number" value={editProfileData.phone} onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="Address" value={editProfileData.address} onChange={(e) => setEditProfileData({...editProfileData, address: e.target.value})} />
              <input style={styles.input} type="text" placeholder="Tax ID (Optional)" value={editProfileData.taxId} onChange={(e) => setEditProfileData({...editProfileData, taxId: e.target.value})} />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.submitBtn}>Save Changes</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowEditProfileModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBankModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={{ marginBottom: '20px' }}>Bank Account</h2>
            <form onSubmit={saveBankAccount}>
              <input style={styles.input} type="text" placeholder="Account Holder Name" value={bankAccount.accountName} onChange={(e) => setBankAccount({...bankAccount, accountName: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="Account Number" value={bankAccount.accountNumber} onChange={(e) => setBankAccount({...bankAccount, accountNumber: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="Bank Name" value={bankAccount.bankName} onChange={(e) => setBankAccount({...bankAccount, bankName: e.target.value})} required />
              <input style={styles.input} type="text" placeholder="Routing Number" value={bankAccount.routingNumber} onChange={(e) => setBankAccount({...bankAccount, routingNumber: e.target.value})} required />
              <div style={styles.modalActions}>
                <button type="submit" style={styles.submitBtn} disabled={loadingBank}>Save</button>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowBankModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReplyModal && selectedReviewForReply && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2>Reply to Review</h2>
            <p><strong>Customer:</strong> {selectedReviewForReply.customerId?.firstName} {selectedReviewForReply.customerId?.lastName}</p>
            <p><strong>Review:</strong> {selectedReviewForReply.providerReview}</p>
            <textarea
              style={styles.textarea}
              rows="4"
              placeholder="Write your response..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div style={styles.modalActions}>
              <button onClick={async () => {
                try {
                  const res = await fetch(`https://carcare-api.brianbakari22.workers.dev/api/reviews/reply/${selectedReviewForReply._id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ response: replyText })
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success('Reply sent!');
                    setShowReplyModal(false);
                    setReplyText('');
                    fetchProviderReviews();
                  }
                } catch (error) {
                  toast.error('Failed to send reply');
                }
              }} style={styles.submitBtn}>Send Reply</button>
              <button onClick={() => setShowReplyModal(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderDashboard;
