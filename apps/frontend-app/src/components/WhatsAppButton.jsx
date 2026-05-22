import React from 'react';

const WhatsAppButton = ({ phoneNumber, message, children, style, className }) => {
  // Format phone number (remove non-digits)
  const formattedPhone = phoneNumber?.toString().replace(/[^0-9]/g, '') || '';
  
  if (!formattedPhone || formattedPhone.length < 9) {
    return null;
  }
  
  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        backgroundColor: '#25D366',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: '500',
        ...style
      }}
      className={className}
    >
      <span style={{ fontSize: '16px' }}>💬</span>
      {children || 'WhatsApp'}
    </a>
  );
};

export default WhatsAppButton;
