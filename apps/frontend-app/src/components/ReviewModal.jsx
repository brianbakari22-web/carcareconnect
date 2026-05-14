import React, { useState } from 'react';
import { toast } from 'react-toastify';

function ReviewModal({ booking, onClose, onSuccess }) {
  const [providerRating, setProviderRating] = useState(5);
  const [providerReview, setProviderReview] = useState('');
  const [driverRating, setDriverRating] = useState(5);
  const [driverReview, setDriverReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const token = localStorage.getItem('token');
  
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('https://carcareconnect-backend.onrender.com/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking._id,
          providerRating,
          providerReview,
          driverRating: booking.driverId ? driverRating : undefined,
          driverReview: booking.driverId ? driverReview : undefined
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Thank you for your review!');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderStars = (rating, setRating) => {
    return (
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            onClick={() => setRating(star)}
            style={{
              fontSize: '28px',
              cursor: 'pointer',
              color: star <= rating ? '#f59e0b' : '#d1d5db'
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };
  
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2>Rate Your Experience</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <div style={styles.modalBody}>
          <div style={styles.serviceInfo}>
            <strong>{booking.serviceName}</strong>
            <div>{new Date(booking.bookingDate).toLocaleDateString()}</div>
          </div>
          
          <div style={styles.section}>
            <label style={styles.label}>Rate the Provider</label>
            {renderStars(providerRating, setProviderRating)}
            <textarea
              style={styles.textarea}
              placeholder="Share your experience with the provider..."
              value={providerReview}
              onChange={(e) => setProviderReview(e.target.value)}
              rows="3"
            />
          </div>
          
          {booking.driverId && (
            <div style={styles.section}>
              <label style={styles.label}>Rate the Driver</label>
              {renderStars(driverRating, setDriverRating)}
              <textarea
                style={styles.textarea}
                placeholder="Share your experience with the driver..."
                value={driverReview}
                onChange={(e) => setDriverReview(e.target.value)}
                rows="3"
              />
            </div>
          )}
        </div>
        
        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Not Now</button>
          <button style={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '500px',
    maxWidth: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#8b5cf6',
    color: 'white',
    borderRadius: '12px 12px 0 0'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'white'
  },
  modalBody: { padding: '20px' },
  serviceInfo: {
    backgroundColor: '#f3e8ff',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  section: { marginBottom: '20px' },
  label: { display: 'block', fontWeight: 'bold', marginBottom: '8px' },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginTop: '10px',
    fontFamily: 'inherit'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitBtn: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};

export default ReviewModal;
