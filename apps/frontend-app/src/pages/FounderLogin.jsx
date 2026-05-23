import React, { useState } from 'react';
import { toast } from 'react-toastify';

function FounderLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('https://carcare-api.brianbakari22.workers.dev/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'admin' })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        toast.success('Welcome Founder!');
        window.location.href = '/admin-dashboard';
      } else {
        toast.error('Invalid admin credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 40px -12px rgba(0,0,0,0.25)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>👑</div>
        <h2 style={{ marginBottom: '5px', color: '#1f2937' }}>Founder Access</h2>
        <p style={{ color: '#6b7280', marginBottom: '30px', fontSize: '14px' }}>Restricted Area - Authorized Personnel Only</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </form>
        
        <p style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>
          🔒 Authorized personnel only
        </p>
      </div>
    </div>
  );
}

export default FounderLogin;
