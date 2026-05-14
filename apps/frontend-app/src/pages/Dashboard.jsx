import React from 'react';
import DriverDashboard from './DriverDashboard';
import ProviderDashboard from './ProviderDashboard';
import CustomerDashboard from './CustomerDashboard';
import AdminDashboard from './AdminDashboard';

function Dashboard({ user, onLogout }) {
  console.log('Dashboard - User role:', user?.role);

  if (user?.role === 'customer') {
    return <CustomerDashboard user={user} onLogout={onLogout} />;
  }

  if (user?.role === 'provider') {
    return <ProviderDashboard user={user} onLogout={onLogout} />;
  }

  if (user?.role === 'driver') {
    return <DriverDashboard user={user} onLogout={onLogout} />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard user={user} onLogout={onLogout} />;
  }

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Loading dashboard...</h2>
    </div>
  );
}

export default Dashboard;
