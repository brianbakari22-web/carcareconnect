import React, { useState } from 'react';

function LoginPage({ role, onBack, onLogin, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const loginData = { email, password, role };
    console.log('Sending login request:', loginData);

    try {
      const response = await fetch('https://carcare-api.brianbakari22.workers.dev/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const roleIcons = { customer: '👤', provider: '🔧', driver: '🚗', admin: '👑' };
  const roleTitles = { customer: 'Customer Login', provider: 'Provider Login', driver: 'Driver Login', admin: 'Admin Login' };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button onClick={onBack} style={styles.backButton}>← Back to Roles</button>
        
        <div style={styles.logoSection}>
          <span style={styles.logoIcon}>🚗💨</span>
          <h2 style={styles.brandName}>Car Care Connect</h2>
        </div>
        
        <div style={styles.roleIcon}>{roleIcons[role]}</div>
        <h2 style={styles.title}>{roleTitles[role]}</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Logging in...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        <div style={styles.registerContainer}>
          <p style={styles.registerText}>
            Don't have an account?{' '}
            <button onClick={onRegister} style={styles.registerLink}>
              Create Account
            </button>
          </p>
        </div>

        {/* Debug info */}
        <div style={{ fontSize: '10px', color: '#ccc', marginTop: '20px', textAlign: 'center' }}>
          API URL: https://carcare-api.brianbakari22.workers.dev/api/auth/login
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', backgroundColor: '#f9fafb' },
  card: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px', position: 'relative' },
  backButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: '20px', fontSize: '14px' },
  logoSection: { textAlign: 'center', marginBottom: '20px' },
  logoIcon: { fontSize: '36px', display: 'block' },
  brandName: { fontSize: '18px', color: '#6b7280', marginTop: '5px' },
  roleIcon: { fontSize: '48px', textAlign: 'center', marginBottom: '15px' },
  title: { textAlign: 'center', marginBottom: '25px', color: '#1f2937', fontSize: '1.5rem' },
  input: { width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
  error: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '14px' },
  registerContainer: { textAlign: 'center', marginTop: '20px' },
  registerText: { color: '#6b7280', fontSize: '14px' },
  registerLink: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }
};

export default LoginPage;
