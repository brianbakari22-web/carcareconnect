// Modern UI Components - Reusable styled components
import React from 'react';

// Gradient Card Component
export const GradientCard = ({ children, onClick, style }) => (
  <div
    onClick={onClick}
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }
    }}
  >
    {children}
  </div>
);

// Stat Card Component
export const StatCard = ({ icon, value, label, gradient }) => (
  <div style={{
    background: `linear-gradient(135deg, ${gradient?.start || '#8b5cf6'} 0%, ${gradient?.end || '#6d28d9'} 100%)`,
    borderRadius: '20px',
    padding: '20px',
    color: 'white',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, fontSize: '80px' }}>{icon}</div>
    <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>{value}</div>
    <div style={{ fontSize: '14px', opacity: 0.9 }}>{label}</div>
  </div>
);

// Modern Button Component
export const ModernButton = ({ children, onClick, variant = 'primary', disabled }) => {
  const variants = {
    primary: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    secondary: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: variants[variant] || variants.primary,
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
};

// Badge Component
export const Badge = ({ status, children }) => {
  const statusColors = {
    pending: { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
    confirmed: { bg: '#d1fae5', color: '#065f46', icon: '✅' },
    'in-progress': { bg: '#e0e7ff', color: '#4338ca', icon: '🔧' },
    completed: { bg: '#d1fae5', color: '#065f46', icon: '✔️' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
    'driver-assigned': { bg: '#e0e7ff', color: '#4338ca', icon: '🚗' }
  };
  const config = statusColors[status] || { bg: '#f3f4f6', color: '#6b7280', icon: '📌' };
  
  return (
    <span style={{
      backgroundColor: config.bg,
      color: config.color,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span>{config.icon}</span>
      {children || status}
    </span>
  );
};

// Loading Skeleton
export const Skeleton = ({ width, height, borderRadius = '12px' }) => (
  <div style={{
    width: width || '100%',
    height: height || '20px',
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    borderRadius: borderRadius,
    animation: 'shimmer 1.5s infinite'
  }} />
);
