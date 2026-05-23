import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSocket } from '../hooks/useSocket';
import WhatsAppButton from '../components/WhatsAppButton';
import { StatCard, ModernButton, Badge } from '../components/ModernUI';
import { initializePushNotifications, requestNotificationPermission, sendPushNotification } from '../utils/pushNotifications';

function DriverDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [history, setHistory] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, weekly: 0, today: 0, perDelivery: 20, totalDeliveries: 0, pendingPayout: 0 });
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [completedPayouts, setCompletedPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null, address: 'Fetching location...', lastUpdate: null });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [driverRating, setDriverRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [stripeStatus, setStripeStatus] = useState({ hasAccount: false, status: null, onboardingComplete: false });
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    driversLicense: user?.driversLicense || '',
    address: user?.address || ''
  });
  const [editProfileData, setEditProfileData] = useState(profileData);
  const [settings, setSettings] = useState({
    emailNotifications: true, pushNotifications: true, smsNotifications: false, darkMode: false, language: 'english'
  });
  const [bankAccount, setBankAccount] = useState({ accountName: '', accountNumber: '', bankName: '', routingNumber: '' });
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState({ model: user?.vehicleModel || 'Toyota Camry', color: user?.vehicleColor || 'White', plate: user?.vehiclePlate || 'KCA 123A', year: user?.vehicleYear || 2022 });
  const [driverStats, setDriverStats] = useState({ rating: 4.8, totalRatings: 0, acceptanceRate: 98, onTimeRate: 96, totalDistance: 0, totalHours: 0 });

  const token = localStorage.getItem('token');

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setProfileData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          driversLicense: data.user.driversLicense || '',
          address: data.user.address || ''
        });
        setEditProfileData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          driversLicense: data.user.driversLicense || '',
          address: data.user.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const { 
    isConnected,
    updateDriverLocation,
    goOnline,
    goOffline,
    onDriverStatusChange,
    onBookingStatusChanged,
    updateBookingStatus,
    joinBookingRoom
  } = useSocket();

  useEffect(() => {
    initializePushNotifications();
    fetchUserProfile();
  }, []);

  const fetchDriverRating = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/reviews/driver/my-ratings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDriverRating(data.averageRating);
        setTotalReviews(data.totalReviews);
        setDriverStats(prev => ({ ...prev, rating: data.averageRating, totalRatings: data.totalReviews }));
      }
    } catch (error) {
      console.error('Error fetching driver rating:', error);
    }
  };

  const startLocationTracking = () => {
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId);
    }
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = {
          lat: latitude,
          lng: longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          lastUpdate: new Date()
        };
        setCurrentLocation(newLocation);
        if (isOnline) {
          updateDriverLocation(latitude, longitude);
        }
        setIsSharingLocation(true);
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === 1) {
          toast.warning('Please enable location access to share your location with customers');
        } else if (error.code === 2) {
          toast.warning('Location unavailable. Please check your GPS.');
        } else if (error.code === 3) {
          toast.warning('Location timeout. Please try again.');
        }
        setIsSharingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    setLocationWatchId(watchId);
  };

  const stopLocationTracking = () => {
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
    setIsSharingLocation(false);
  };

  const handleOnlineToggle = async (online) => {
    setIsOnline(online);
    if (online) {
      goOnline();
      startLocationTracking();
      toast.success('You are now online! Customers can see your location.');
      sendPushNotification('You are Online', 'Customers can now see your location');
    } else {
      goOffline();
      stopLocationTracking();
      toast.info('You are now offline');
    }
    try {
      await fetch('http://localhost:5000/api/driver/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isOnline: online })
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  useEffect(() => {
    const unsubscribeBooking = onBookingStatusChanged((data) => {
      console.log('Booking status changed:', data);
      fetchAllData();
      if (data.status === 'completed') {
        toast.success(`Delivery completed!`);
        sendPushNotification('Delivery Completed', 'You have completed a delivery!');
        fetchDriverRating();
      } else if (data.status === 'cancelled') {
        toast.warning(`Delivery cancelled`);
      }
    });
    const unsubscribeDriver = onDriverStatusChange((data) => {
      if (data.driverId === user?._id && data.isOnline !== isOnline) {
        setIsOnline(data.isOnline);
        if (data.isOnline) {
          startLocationTracking();
          toast.info('You have been set online');
        } else {
          stopLocationTracking();
          toast.info('You have been set offline');
        }
      }
    });
    return () => {
      if (unsubscribeBooking) unsubscribeBooking();
      if (unsubscribeDriver) unsubscribeDriver();
      stopLocationTracking();
    };
  }, [onBookingStatusChanged, onDriverStatusChange]);

  useEffect(() => {
    fetchAllData();
    fetchBankAccount();
    checkStripeStatus();
    fetchDriverRating();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const dashboardRes = await fetch('http://localhost:5000/api/driver/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dashboardData = await dashboardRes.json();
      if (dashboardData.success) {
        const data = dashboardData.data;
        setAvailableDeliveries(data.deliveries?.available || []);
        setActiveJobs(data.deliveries?.active || []);
        setHistory(data.deliveries?.history || []);
        setEarnings(data.earnings || { total: 0, weekly: 0, today: 0, perDelivery: 20, totalDeliveries: 0, pendingPayout: 0 });
        setDriverStats(data.stats || { rating: 4.8, acceptanceRate: 98, onTimeRate: 96 });
        setIsOnline(data.isOnline || false);
        if (data.currentLocation) {
          setCurrentLocation(data.currentLocation);
        }
        setProfileData({
          firstName: data.profile?.firstName || user?.firstName,
          lastName: data.profile?.lastName || user?.lastName,
          email: data.profile?.email || user?.email,
          phone: data.profile?.phone || user?.phone,
          driversLicense: data.profile?.driversLicense || '',
          address: data.profile?.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccount = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/driver/bank-account', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.bankAccount) {
        setBankAccount(data.bankAccount);
        setHasBankAccount(true);
      }
    } catch (error) { console.error(error); }
  };

  const fetchPayoutHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/driver/payout-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingDeliveries(data.pendingDeliveries || []);
        setCompletedPayouts(data.completedPayouts || []);
        setEarnings(prev => ({ ...prev, pendingPayout: data.pendingTotal || 0 }));
      }
    } catch (error) { console.error(error); }
  };

  const saveBankAccount = async (e) => {
    e.preventDefault();
    setLoadingBank(true);
    try {
      const res = await fetch('http://localhost:5000/api/driver/bank-account', {
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
        const res = await fetch('http://localhost:5000/api/driver/bank-account', {
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
      const res = await fetch('http://localhost:5000/api/stripe/account-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStripeStatus(data);
    } catch (error) { console.error(error); }
  };

  const connectStripe = async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch('http://localhost:5000/api/stripe/onboarding-link', {
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
        const res = await fetch('http://localhost:5000/api/stripe/disconnect', {
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

  const requestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    if (parseFloat(payoutAmount) > earnings.pendingPayout) {
      toast.error('Amount exceeds balance');
      return;
    }
    if (!hasBankAccount) {
      toast.error('Please add a bank account first');
      setShowBankModal(true);
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/driver/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(payoutAmount) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payout requested!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        fetchPayoutHistory();
        fetchAllData();
      } else {
        toast.error(data.error);
      }
    } catch (error) { toast.error('Failed to request'); }
  };

  const acceptDelivery = async (deliveryId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/driver/accept/${deliveryId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Delivery accepted!');
        sendPushNotification('Delivery Accepted', 'You have accepted a delivery');
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to accept');
      }
    } catch (error) { toast.error('Error accepting delivery'); }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      updateBookingStatus(deliveryId, status);
      const res = await fetch(`http://localhost:5000/api/driver/delivery/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Delivery marked as ${status}!`);
        sendPushNotification(`Delivery ${status}`, `Your delivery has been marked as ${status}`);
        fetchAllData();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) { toast.error('Error updating status'); }
  };

  const updateVehicleInfo = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/driver/vehicle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(vehicleInfo)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Vehicle info updated!');
        setShowVehicleModal(false);
        fetchAllData();
      }
    } catch (error) { toast.error('Failed to update vehicle'); }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editProfileData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated!');
        setProfileData(editProfileData);
        setShowEditProfileModal(false);
        fetchUserProfile();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) { toast.error('Failed to update profile'); }
  };

  const downloadInvoice = async (payoutId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/invoices/download/${payoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (err) { toast.error('Error downloading invoice'); }
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

  const todayEarnings = earnings.today || 0;
  const todayCompleted = history.filter(d => { const today = new Date(); const deliveryDate = new Date(d.completedAt || d.createdAt); return d.status === 'completed' && deliveryDate.getDate() === today.getDate() && deliveryDate.getMonth() === today.getMonth() && deliveryDate.getFullYear() === today.getFullYear(); }).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: '#8b5cf6' },
    { id: 'available', label: 'Available', icon: '📦', color: '#10b981', badge: availableDeliveries.length },
    { id: 'active', label: 'Active', icon: '🚗', color: '#ec4899', badge: activeJobs.length },
    { id: 'history', label: 'History', icon: '📋', color: '#3b82f6' },
    { id: 'earnings', label: 'Earnings', icon: '💰', color: '#22c55e' },
    { id: 'vehicle', label: 'Vehicle', icon: '🚗', color: '#f59e0b' },
    { id: 'profile', label: 'Profile', icon: '👤', color: '#8b5cf6' },
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
    menuBadge: { backgroundColor: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px' },
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
    onlineToggle: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 15px', borderRadius: '20px',
      border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
      backgroundColor: isOnline ? '#10b981' : '#ef4444'
    },
    locationBtn: { background: 'none', border: '1px solid #d1d5db', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px' },
    locationStatus: { fontSize: '11px', padding: '2px 6px', borderRadius: '10px', backgroundColor: isSharingLocation ? '#d1fae5' : '#fee2e2', color: isSharingLocation ? '#065f46' : '#991b1b' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' },
    userName: { fontWeight: '500', color: darkMode ? 'white' : '#374151' },
    logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    emailBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', marginTop: '10px' },
    contentArea: { padding: '24px 30px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '16px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    statValue: { fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', margin: '8px 0' },
    statLabel: { fontSize: '12px', color: '#6b7280' },
    payoutBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginTop: '5px' },
    quickStats: { display: 'flex', gap: '15px', padding: '0 0 20px 0', flexWrap: 'wrap' },
    quickStat: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '8px 15px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    twoColumn: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    card: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' },
    cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: darkMode ? 'white' : '#374151' },
    performanceItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' },
    performanceValue: { fontWeight: 'bold', color: '#8b5cf6' },
    activeJobItem: { padding: '10px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    availableItem: { padding: '10px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    acceptSmallBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    deliveryCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    deliveryHeader: { backgroundColor: darkMode ? '#334155' : '#f9fafb', padding: '15px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    deliveryType: { fontWeight: 'bold', color: '#f59e0b' },
    deliveryContent: { padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
    pickupInfo: { flex: 1, display: 'flex', gap: '15px', alignItems: 'flex-start' },
    shopInfo: { flex: 1, display: 'flex', gap: '15px', alignItems: 'flex-start' },
    infoIcon: { fontSize: '24px' },
    arrowIcon: { fontSize: '20px', color: '#9ca3af' },
    priceBadge: { display: 'inline-block', backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '15px', fontSize: '12px' },
    deliveryFooter: { padding: '15px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    acceptBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    activeCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    activeHeader: { backgroundColor: darkMode ? '#334155' : '#f9fafb', padding: '15px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' },
    activeType: { fontWeight: 'bold', color: '#3b82f6' },
    progressSteps: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '10px', flexWrap: 'wrap' },
    step: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#9ca3af' },
    stepActive: { color: '#f59e0b', fontWeight: 'bold' },
    stepCompleted: { color: '#10b981' },
    stepLine: { width: '40px', height: '2px', backgroundColor: '#e5e7eb' },
    jobDetails: { padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' },
    actionButtons: { padding: '15px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', flexWrap: 'wrap' },
    pickupBtn: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    completeBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    contactBtn: { backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    filterSelect: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    historyCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '15px', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    earningText: { color: '#10b981', fontWeight: 'bold', marginTop: '5px' },
    earningsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    payoutRequestBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    earningsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' },
    earningsCard: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '20px', borderRadius: '16px', textAlign: 'center' },
    pendingItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb' },
    pendingAmount: { fontSize: '16px', fontWeight: 'bold', color: '#10b981' },
    payoutItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '10px' },
    payoutAmount: { fontSize: '16px', fontWeight: 'bold', color: '#10b981' },
    invoiceBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#6b7280' },
    vehicleContainer: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '30px', borderRadius: '16px' },
    vehicleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    editBtn: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    vehicleCard: { display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', backgroundColor: darkMode ? '#334155' : '#f9fafb', borderRadius: '16px', marginBottom: '20px' },
    vehicleIcon: { fontSize: '48px' },
    profileContainer: { backgroundColor: darkMode ? '#1e293b' : '#ffffff', padding: '30px', borderRadius: '16px' },
    profileHeader: { display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap' },
    profileAvatar: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'white' },
    editProfileBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
    profileInfo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginBottom: '30px' },
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
    settingsSection: { marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' },
    saveSettingsBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: darkMode ? '#1e293b' : 'white', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%' },
    modalContentSmall: { backgroundColor: darkMode ? '#1e293b' : 'white', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '90%' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    textarea: { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #d1d5db', borderRadius: '8px', minHeight: '80px', backgroundColor: darkMode ? '#334155' : 'white', color: darkMode ? 'white' : '#374151' },
    modalActions: { display: 'flex', gap: '10px', marginTop: '20px' },
    submitBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    cancelBtn: { backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚗💨</div>
            <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading driver dashboard...</div>
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
              <span style={styles.menuLabel}>
                {item.label}
                {item.badge > 0 && <span style={styles.menuBadge}>{item.badge}</span>}
              </span>
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
            <button style={styles.onlineToggle} onClick={() => handleOnlineToggle(!isOnline)}>
              <span style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%', display: 'inline-block' }}></span>
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <div style={styles.locationStatus}>
              {isSharingLocation ? '📍 GPS Active' : '📍 GPS Off'}
            </div>
            <button style={styles.locationBtn} onClick={() => setShowLocationModal(true)}>📍</button>
            <div style={styles.notificationIcon} onClick={() => setShowNotifications(!showNotifications)}>
              🔔{unreadCount > 0 && <span style={styles.notificationBadge}>{unreadCount}</span>}
            </div>
            <button style={styles.themeToggle} onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{profileData.firstName?.charAt(0) || 'D'}</div>
              <div>
                <div style={styles.userName}>{profileData.firstName} {profileData.lastName}</div>
                <div style={{ fontSize: '11px', color: '#8b5cf6' }}>⭐ {driverRating || driverStats.rating}</div>
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
            <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>No notifications</div>
          </div>
        )}

        <div style={styles.contentArea}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}><div style={styles.statValue}>${todayEarnings}</div><div style={styles.statLabel}>Today</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>${earnings.weekly}</div><div style={styles.statLabel}>Weekly</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>${earnings.total}</div><div style={styles.statLabel}>Total</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>{earnings.totalDeliveries}</div><div style={styles.statLabel}>Deliveries</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>{driverRating || driverStats.rating}</div><div style={styles.statLabel}>Rating</div></div>
            <div style={styles.statCard}><div style={styles.statValue}>${earnings.pendingPayout}<button style={styles.payoutBtn} onClick={() => setShowPayoutModal(true)}>Request</button></div><div style={styles.statLabel}>Pending</div></div>
          </div>

          <div style={styles.quickStats}>
            <div style={styles.quickStat}><span>🚗</span> Online: {isOnline ? 'Yes' : 'No'}</div>
            <div style={styles.quickStat}><span>📦</span> Available: {availableDeliveries.length}</div>
            <div style={styles.quickStat}><span>🚚</span> Active: {activeJobs.length}</div>
            <div style={styles.quickStat}><span>🟢</span> Socket: {isConnected ? 'Connected' : 'Disconnected'}</div>
            <div style={styles.quickStat}><span>⭐</span> Rating: {driverRating || driverStats.rating} ({totalReviews} reviews)</div>
            <div style={styles.quickStat}><span>📍</span> GPS: {isSharingLocation ? 'Active' : 'Inactive'}</div>
          </div>

          {activeTab === 'dashboard' && (
            <div style={styles.twoColumn}>
              <div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>📍 Live Location</div>
                  {currentLocation.lat ? (
                    <div>
                      <p>Latitude: {currentLocation.lat.toFixed(6)}</p>
                      <p>Longitude: {currentLocation.lng.toFixed(6)}</p>
                      <p style={{ fontSize: '11px', color: isSharingLocation ? '#10b981' : '#ef4444' }}>
                        {isSharingLocation ? '✅ Sharing with customers' : '❌ Not sharing location'}
                      </p>
                      {currentLocation.lastUpdate && (
                        <p style={{ fontSize: '10px', color: '#6b7280' }}>Last update: {new Date(currentLocation.lastUpdate).toLocaleTimeString()}</p>
                      )}
                    </div>
                  ) : (
                    <p>Waiting for GPS... {!isOnline && <span style={{ color: '#f59e0b' }}>(Go online to start sharing)</span>}</p>
                  )}
                </div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>📊 Today's Performance</div>
                  <div style={styles.performanceItem}><span>Deliveries:</span><span style={styles.performanceValue}>{todayCompleted}</span></div>
                  <div style={styles.performanceItem}><span>Earnings:</span><span style={styles.performanceValue}>${todayEarnings}</span></div>
                  <div style={styles.performanceItem}><span>Acceptance:</span><span style={styles.performanceValue}>{driverStats.acceptanceRate}%</span></div>
                  <div style={styles.performanceItem}><span>On-Time:</span><span style={styles.performanceValue}>{driverStats.onTimeRate}%</span></div>
                  <div style={styles.performanceItem}><span>Rating:</span><span style={styles.performanceValue}>⭐ {driverRating || driverStats.rating}</span></div>
                </div>
              </div>
              <div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>🚗 Active Jobs ({activeJobs.length})</div>
                  {activeJobs.length === 0 ? <p>No active jobs</p> : activeJobs.map(job => (
                    <div key={job._id} style={styles.activeJobItem}>
                      <div><strong>{job.serviceName}</strong></div>
                      <div>Customer: {job.customerId?.firstName}</div>
                      {getStatusBadge(job.status)}
                    </div>
                  ))}
                </div>
                <div style={styles.card}>
                  <div style={styles.cardTitle}>📦 Available ({availableDeliveries.length})</div>
                  {availableDeliveries.length === 0 ? <p>No available deliveries</p> : availableDeliveries.slice(0, 3).map(d => (
                    <div key={d._id} style={styles.availableItem}>
                      <div><strong>{d.serviceName}</strong></div>
                      <div>From: {d.pickupAddress?.substring(0, 30)}...</div>
                      <button style={styles.acceptSmallBtn} onClick={() => acceptDelivery(d._id)} disabled={!isOnline}>Accept</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'available' && (
            <div>
              <div style={styles.sectionHeader}>
                <h2>📦 Available Deliveries ({availableDeliveries.length})</h2>
                <span style={{ backgroundColor: isOnline ? '#d1fae5' : '#fee2e2', color: isOnline ? '#065f46' : '#991b1b', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                  {isOnline ? '🟢 Accepting deliveries' : '🔴 Go online to accept'}
                </span>
              </div>
              {availableDeliveries.length === 0 ? (
                <div style={styles.emptyState}>No available deliveries. Check back later!</div>
              ) : (
                availableDeliveries.map(delivery => (
                  <div key={delivery._id} style={styles.deliveryCard}>
                    <div style={styles.deliveryHeader}>
                      <span style={styles.deliveryType}>🚗 Concierge Pickup</span>
                      {getStatusBadge(delivery.status)}
                    </div>
                    <div style={styles.deliveryContent}>
                      <div style={styles.pickupInfo}>
                        <span style={styles.infoIcon}>📍</span>
                        <div><strong>Pickup:</strong><p>{delivery.pickupAddress || delivery.customerId?.address}</p></div>
                      </div>
                      <div style={styles.arrowIcon}>↓</div>
                      <div style={styles.shopInfo}>
                        <span style={styles.infoIcon}>🔧</span>
                        <div><strong>Shop:</strong><p>{delivery.providerId?.businessName}</p><p>{delivery.serviceName}</p></div>
                      </div>
                    </div>
                    <div style={styles.deliveryFooter}>
                      <span style={styles.priceBadge}>💰 ${earnings.perDelivery}</span>
                      <button 
                        style={styles.acceptBtn} 
                        onClick={() => acceptDelivery(delivery._id)} 
                        disabled={!isOnline}
                      >
                        {isOnline ? 'Accept Delivery →' : 'Go Online to Accept'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div>
              <h2>🚗 Active Jobs ({activeJobs.length})</h2>
              {activeJobs.map(job => (
                <div key={job._id} style={styles.activeCard}>
                  <div style={styles.activeHeader}>
                    <span style={styles.activeType}>🚗 Active Delivery</span>
                    {getStatusBadge(job.status)}
                  </div>
                  <div style={styles.progressSteps}>
                    <div style={{...styles.step, ...(job.status === 'driver-assigned' ? styles.stepActive : styles.stepCompleted)}}><span>1</span> Pickup</div>
                    <div style={styles.stepLine}></div>
                    <div style={{...styles.step, ...(job.status === 'in-progress' ? styles.stepActive : {})}}><span>2</span> Drop-off</div>
                    <div style={styles.stepLine}></div>
                    <div style={{...styles.step, ...(job.status === 'completed' ? styles.stepActive : {})}}><span>3</span> Complete</div>
                  </div>
                  <div style={styles.jobDetails}>
                    <p><strong>Customer:</strong> {job.customerId?.firstName} {job.customerId?.lastName}</p>
                    <p><strong>Phone:</strong> {job.customerId?.phone || 'N/A'}</p>
                    <p><strong>Service:</strong> {job.serviceName}</p>
                    <p><strong>Shop:</strong> {job.providerId?.businessName}</p>
                  </div>
                  <div style={styles.actionButtons}>
                    {job.status === 'driver-assigned' && (
                      <button style={styles.pickupBtn} onClick={() => updateDeliveryStatus(job._id, 'in-progress')}>
                        📍 Confirm Pickup
                      </button>
                    )}
                    {job.status === 'in-progress' && (
                      <button style={styles.completeBtn} onClick={() => updateDeliveryStatus(job._id, 'completed')}>
                        ✅ Complete Delivery
                      </button>
                    )}
                    <button style={styles.contactBtn}>📞 Contact</button>
                    <a href={`mailto:${job.customerId?.email}?subject=Your delivery for ${job.serviceName}&body=Hello%20${job.customerId?.firstName},%0D%0A%0D%0AI am your driver for the delivery of your vehicle for ${job.serviceName}.%0D%0A%0D%0AI will be arriving shortly.%0D%0A%0D%0AThank you!`} style={styles.emailBtn}>✉️ Message Customer</a>
                    
                    {job.customerId?.phone && (
                      <WhatsAppButton 
                        phoneNumber={job.customerId.phone}
                        message={`Hello ${job.customerId?.firstName}, I am your driver for the delivery of your vehicle for ${job.serviceName}. I will be arriving shortly. Thank you!`}
                      >
                        💬 WhatsApp Customer
                      </WhatsAppButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div style={styles.historyHeader}>
                <h2>📋 Delivery History</h2>
                <select style={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              {history.filter(d => filterStatus === 'all' || d.status === filterStatus).map(delivery => (
                <div key={delivery._id} style={styles.historyCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div><strong>{delivery.serviceName}</strong><div>Customer: {delivery.customerId?.firstName}</div><div>📅 {new Date(delivery.bookingDate).toLocaleDateString()}</div></div>
                    <div style={{ textAlign: 'right' }}>{getStatusBadge(delivery.status)}<div style={styles.earningText}>+${earnings.perDelivery}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div>
              <div style={styles.earningsHeader}>
                <h2>💰 Earnings & Payouts</h2>
                <button style={styles.payoutRequestBtn} onClick={() => setShowPayoutModal(true)}>Request Payout</button>
              </div>
              <div style={styles.earningsGrid}>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px' }}>💰</div><div>Total</div><div style={styles.statValue}>${earnings.total}</div></div>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px' }}>📊</div><div>Weekly</div><div style={styles.statValue}>${earnings.weekly}</div></div>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px' }}>📦</div><div>Today</div><div style={styles.statValue}>${earnings.today}</div></div>
                <div style={styles.earningsCard}><div style={{ fontSize: '24px' }}>🚗</div><div>Deliveries</div><div style={styles.statValue}>{earnings.totalDeliveries}</div></div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}>📋 Pending ({pendingDeliveries.length}) - ${earnings.pendingPayout}</div>
                {pendingDeliveries.map(delivery => (
                  <div key={delivery.id} style={styles.pendingItem}>
                    <div><strong>{delivery.serviceName}</strong><div>{new Date(delivery.date).toLocaleDateString()}</div></div>
                    <div style={styles.pendingAmount}>+${delivery.amount}</div>
                  </div>
                ))}
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}>✅ Completed Payouts</div>
                {completedPayouts.map(payout => (
                  <div key={payout.id} style={styles.payoutItem}>
                    <div><strong>{payout.serviceName}</strong><div>{new Date(payout.date).toLocaleDateString()}</div></div>
                    <div style={styles.payoutAmount}>+${payout.amount}</div>
                    <button onClick={() => downloadInvoice(payout.id)} style={styles.invoiceBtn}>📄 Invoice</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div style={styles.vehicleContainer}>
              <div style={styles.vehicleHeader}>
                <h2>🚗 My Vehicle</h2>
                <button style={styles.editBtn} onClick={() => setShowVehicleModal(true)}>✏️ Edit</button>
              </div>
              <div style={styles.vehicleCard}>
                <div style={styles.vehicleIcon}>🚗</div>
                <div><h3>{vehicleInfo.year} {vehicleInfo.model}</h3><p>Color: {vehicleInfo.color}</p><p>License: {vehicleInfo.plate}</p></div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={styles.profileContainer}>
              <h2>👤 Driver Profile</h2>
              <div style={styles.profileHeader}>
                <div style={styles.profileAvatar}>{profileData.firstName?.charAt(0)}</div>
                <div><h2>{profileData.firstName} {profileData.lastName}</h2><p>⭐ {driverRating || driverStats.rating} • {earnings.totalDeliveries} deliveries • {totalReviews} reviews</p><button style={styles.editProfileBtn} onClick={() => setShowEditProfileModal(true)}>✏️ Edit Profile</button></div>
              </div>
              <div style={styles.profileInfo}>
                <div><strong>📧 Email:</strong> {profileData.email}</div><div><strong>📞 Phone:</strong> {profileData.phone}</div>
                <div><strong>🚗 License:</strong> {profileData.driversLicense || 'N/A'}</div><div><strong>📍 Address:</strong> {profileData.address || 'Not set'}</div>
                <div><strong>📦 Deliveries:</strong> {earnings.totalDeliveries}</div><div><strong>✅ Acceptance:</strong> {driverStats.acceptanceRate}%</div>
                <div><strong>⭐ Rating:</strong> {driverRating || driverStats.rating} ({totalReviews} reviews)</div>
              </div>
              <div style={styles.bankSection}>
                <div style={styles.cardTitle}>🏦 Payout Information</div>
                {hasBankAccount ? (
                  <div style={styles.bankCard}>
                    <div><strong>Account Holder:</strong> {bankAccount.accountName}</div>
                    <div><strong>Account:</strong> ••••{bankAccount.accountNumber?.slice(-4)}</div>
                    <div><strong>Bank:</strong> {bankAccount.bankName}</div>
                    <button style={styles.editBankBtn} onClick={() => setShowBankModal(true)}>Update</button>
                    <button style={styles.deleteBankBtn} onClick={deleteBankAccount}>Remove</button>
                  </div>
                ) : (
                  <div style={styles.noBankCard}><button style={styles.addBankBtn} onClick={() => setShowBankModal(true)}>+ Add Bank Account</button></div>
                )}
              </div>
              <div style={styles.stripeSection}>
                <div style={styles.cardTitle}>💳 Automatic Payouts (Stripe Connect)</div>
                {stripeStatus?.onboardingComplete ? (
                  <div style={styles.stripeSuccessCard}><span>✅</span><div><strong>Connected!</strong><button onClick={disconnectStripe} style={styles.disconnectStripeBtn}>Disconnect</button></div></div>
                ) : stripeStatus?.hasAccount ? (
                  <div style={styles.stripePendingCard}><span>⏳</span><div><strong>Pending</strong><button onClick={connectStripe} disabled={loadingStripe} style={styles.connectStripeBtn}>{loadingStripe ? '...' : 'Complete →'}</button></div></div>
                ) : (
                  <div style={styles.stripeCard}><span>💰</span><div><strong>Connect</strong><button onClick={connectStripe} disabled={loadingStripe} style={styles.connectStripeBtn}>{loadingStripe ? '...' : 'Connect →'}</button></div></div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={styles.settingsContainer}>
              <div style={styles.cardTitle}>⚙️ Settings</div>
              <div style={styles.settingsSection}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🔔 Notifications</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} /> Email</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><input type="checkbox" checked={settings.pushNotifications} onChange={(e) => setSettings({...settings, pushNotifications: e.target.checked})} /> Push</label>
              </div>
              <button style={styles.enableNotificationsBtn} onClick={requestNotificationPermission}>🔔 Enable Push Notifications</button>
              <button style={styles.saveSettingsBtn} onClick={() => toast.success('Settings saved!')}>Save</button>
            </div>
          )}
        </div>
      </div>

      {showEditProfileModal && (
        <div style={styles.modal}><div style={styles.modalContent}><h2>Edit Profile</h2><form onSubmit={updateProfile}>
          <input style={styles.input} type="text" placeholder="First Name" value={editProfileData.firstName} onChange={(e) => setEditProfileData({...editProfileData, firstName: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="Last Name" value={editProfileData.lastName} onChange={(e) => setEditProfileData({...editProfileData, lastName: e.target.value})} required />
          <input style={styles.input} type="email" placeholder="Email" value={editProfileData.email} onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})} required />
          <input style={styles.input} type="tel" placeholder="Phone" value={editProfileData.phone} onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="License" value={editProfileData.driversLicense} onChange={(e) => setEditProfileData({...editProfileData, driversLicense: e.target.value})} />
          <div style={styles.modalActions}><button type="submit" style={styles.submitBtn}>Save</button><button type="button" style={styles.cancelBtn} onClick={() => setShowEditProfileModal(false)}>Cancel</button></div>
        </form></div></div>
      )}

      {showBankModal && (
        <div style={styles.modal}><div style={styles.modalContent}><h2>Bank Account</h2><form onSubmit={saveBankAccount}>
          <input style={styles.input} type="text" placeholder="Account Holder" value={bankAccount.accountName} onChange={(e) => setBankAccount({...bankAccount, accountName: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="Account Number" value={bankAccount.accountNumber} onChange={(e) => setBankAccount({...bankAccount, accountNumber: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="Bank Name" value={bankAccount.bankName} onChange={(e) => setBankAccount({...bankAccount, bankName: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="Routing Number" value={bankAccount.routingNumber} onChange={(e) => setBankAccount({...bankAccount, routingNumber: e.target.value})} required />
          <div style={styles.modalActions}><button type="submit" style={styles.submitBtn} disabled={loadingBank}>Save</button><button type="button" style={styles.cancelBtn} onClick={() => setShowBankModal(false)}>Cancel</button></div>
        </form></div></div>
      )}

      {showPayoutModal && (
        <div style={styles.modal}><div style={styles.modalContentSmall}><h2>Request Payout</h2><p>Available: <strong>${earnings.pendingPayout}</strong></p><p>Per delivery: ${earnings.perDelivery}</p><input type="number" style={styles.input} placeholder="Amount" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} /><div style={styles.modalActions}><button onClick={requestPayout} style={styles.submitBtn}>Submit</button><button onClick={() => setShowPayoutModal(false)} style={styles.cancelBtn}>Cancel</button></div></div></div>
      )}

      {showLocationModal && (
        <div style={styles.modal}><div style={styles.modalContentSmall}><h2>Location Status</h2>{currentLocation.lat ? (<div><p>Lat: {currentLocation.lat.toFixed(6)}</p><p>Lng: {currentLocation.lng.toFixed(6)}</p><p style={{ color: isSharingLocation ? '#10b981' : '#ef4444' }}>{isSharingLocation ? '✅ GPS Active - Sharing with customers' : '❌ GPS Inactive'}</p><p style={{ fontSize: '11px', color: '#6b7280' }}>Last update: {currentLocation.lastUpdate ? new Date(currentLocation.lastUpdate).toLocaleTimeString() : 'Never'}</p></div>) : (<p>Waiting for GPS signal...</p>)}<button onClick={() => setShowLocationModal(false)} style={styles.submitBtn}>Close</button></div></div>
      )}

      {showVehicleModal && (
        <div style={styles.modal}><div style={styles.modalContentSmall}><h2>Update Vehicle</h2><form onSubmit={updateVehicleInfo}>
          <input style={styles.input} type="text" placeholder="Model" value={vehicleInfo.model} onChange={(e) => setVehicleInfo({...vehicleInfo, model: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="Color" value={vehicleInfo.color} onChange={(e) => setVehicleInfo({...vehicleInfo, color: e.target.value})} required />
          <input style={styles.input} type="text" placeholder="Plate" value={vehicleInfo.plate} onChange={(e) => setVehicleInfo({...vehicleInfo, plate: e.target.value})} required />
          <input style={styles.input} type="number" placeholder="Year" value={vehicleInfo.year} onChange={(e) => setVehicleInfo({...vehicleInfo, year: e.target.value})} required />
          <div style={styles.modalActions}><button type="submit" style={styles.submitBtn}>Save</button><button type="button" style={styles.cancelBtn} onClick={() => setShowVehicleModal(false)}>Cancel</button></div>
        </form></div></div>
      )}
    </div>
  );
}

export default DriverDashboard;
