import React from 'react';

const roles = [
  { id: 'customer', name: 'Customer', icon: '👤', description: 'Book auto services for your vehicle', color: '#3b82f6' },
  { id: 'provider', name: 'Service Provider', icon: '🔧', description: 'Offer auto services to customers', color: '#10b981' },
  { id: 'driver', name: 'Concierge Driver', icon: '🚗', description: 'Pickup and deliver vehicles', color: '#f59e0b' },
  { id: 'admin', name: 'Administrator', icon: '👑', description: 'Manage platform operations', color: '#8b5cf6' }
];

function RoleSelect({ onSelectRole }) {
  return (
    <div style={styles.container}>
      <div style={styles.logoContainer}>
        <span style={styles.logoIcon}>🚗💨</span>
        <h1 style={styles.title}>Car Care Connect</h1>
        <p style={styles.tagline}>Connect • Care • Drive</p>
      </div>
      <p style={styles.subtitle}>Select your role to continue</p>
      
      <div style={styles.grid}>
        {roles.map(role => (
          <div
            key={role.id}
            style={{ ...styles.card, borderTop: `4px solid ${role.color}` }}
            onClick={() => onSelectRole(role.id)}
          >
            <div style={{ ...styles.icon, backgroundColor: role.color + '20', color: role.color }}>
              {role.icon}
            </div>
            <h3 style={styles.roleName}>{role.name}</h3>
            <p style={styles.description}>{role.description}</p>
            <button style={{ ...styles.button, backgroundColor: role.color }}>Select →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#f9fafb',
    minHeight: '100vh'
  },
  logoContainer: {
    marginBottom: '20px'
  },
  logoIcon: {
    fontSize: '48px',
    display: 'block'
  },
  title: {
    fontSize: '2.5rem',
    color: '#1f2937',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  tagline: {
    fontSize: '0.9rem',
    color: '#6b7280',
    letterSpacing: '2px'
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#6b7280',
    marginBottom: '40px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  icon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '40px'
  },
  roleName: {
    fontSize: '1.3rem',
    marginBottom: '10px',
    color: '#374151'
  },
  description: {
    color: '#6b7280',
    marginBottom: '20px',
    fontSize: '0.9rem'
  },
  button: {
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  }
};

export default RoleSelect;
