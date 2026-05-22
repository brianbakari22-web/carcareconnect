import React, { useState, useEffect } from 'react';
import RoleSelect from './pages/RoleSelect';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [step, setStep] = useState('role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Check URL on mount and when URL changes
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      console.log('Current path:', path); // Debug log
      
      if (path === '/admin-dashboard') {
        const storedAdminUser = localStorage.getItem('adminUser');
        console.log('Admin user found:', !!storedAdminUser);
        if (storedAdminUser) {
          setIsAdminRoute(true);
          setAdminUser(JSON.parse(storedAdminUser));
        } else {
          window.location.href = '/admin-login-simple.html';
        }
      } else {
        setIsAdminRoute(false);
      }
    };
    
    checkRoute();
    
    // Listen for URL changes
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  // If this is admin route, show admin dashboard
  if (isAdminRoute && adminUser) {
    return <AdminDashboard user={adminUser} onLogout={() => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/';
    }} />;
  }

  // Normal user flows
  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setStep('login');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setStep('dashboard');
  };

  const handleRegister = () => setStep('register');
  const handleRegisterComplete = () => setStep('login');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setStep('role');
  };

  const handleBack = () => {
    setStep('role');
    setSelectedRole(null);
  };

  if (step === 'role') {
    return <RoleSelect onSelectRole={handleSelectRole} />;
  }
  if (step === 'login') {
    return (
      <LoginPage 
        role={selectedRole} 
        onBack={handleBack} 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
      />
    );
  }
  if (step === 'register') {
    return (
      <RegisterPage 
        role={selectedRole} 
        onBack={handleBack} 
        onRegisterComplete={handleRegisterComplete} 
      />
    );
  }
  if (step === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}

export default App;
