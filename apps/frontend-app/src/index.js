import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import RoleSelect from './pages/RoleSelect';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  const [step, setStep] = useState('role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [user, setUser] = useState(null);

  // Check if user is already logged in on app start
  React.useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      const parsedUser = JSON.parse(storedUser);
      console.log('Restored user from storage:', parsedUser);
      setUser(parsedUser);
      setStep('dashboard');
    }
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setStep('login');
  };

  const handleLogin = (userData) => {
    console.log('Login successful, user data:', userData);
    console.log('User role:', userData.role);
    setUser(userData);
    setStep('dashboard');
  };

  const handleRegister = () => {
    setStep('register');
  };

  const handleRegisterComplete = () => {
    setStep('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSelectedRole(null);
    setStep('role');
  };

  const handleBack = () => {
    setStep('role');
    setSelectedRole(null);
  };

  console.log('App state:', { step, selectedRole, user });

  if (step === 'role') {
    return <RoleSelect onSelectRole={handleSelectRole} />;
  }

  if (step === 'login') {
    return <LoginPage role={selectedRole} onBack={handleBack} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (step === 'register') {
    return <RegisterPage role={selectedRole} onBack={handleBack} onRegisterComplete={handleRegisterComplete} />;
  }

  if (step === 'dashboard') {
    console.log('Rendering dashboard for user:', user);
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
