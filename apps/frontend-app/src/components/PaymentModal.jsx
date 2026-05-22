import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import PromoCodeInput from './PromoCodeInput';

function PaymentModal({ booking, amount, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(amount);
  
  const token = localStorage.getItem('token');
  
  const handleCardPayment = async () => {
    if (!stripe || !elements) {
      toast.error('Stripe not initialized');
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create payment intent
      const intentRes = await fetch('http://localhost:5000/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking._id,
          amount: finalAmount
        })
      });
      
      const intentData = await intentRes.json();
      if (!intentData.success) {
        throw new Error(intentData.error);
      }
      
      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: booking.customerName
          }
        }
      });
      
      if (error) {
        toast.error(error.message);
        setProcessing(false);
        return;
      }
      
      // Confirm payment on backend
      const confirmRes = await fetch('http://localhost:5000/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          bookingId: booking._id
        })
      });
      
      const confirmData = await confirmRes.json();
      if (confirmData.success) {
        toast.success('Payment successful!');
        onSuccess();
      } else {
        toast.error(confirmData.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleCashPayment = async () => {
    setProcessing(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/payments/cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: booking._id,
          amount: finalAmount
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Booking confirmed! Pay at the shop.');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to confirm booking');
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      toast.error('Failed to confirm booking');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentMethod === 'card') {
      handleCardPayment();
    } else {
      handleCashPayment();
    }
  };
  
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' }
      },
      invalid: { color: '#9e2146' }
    }
  };
  
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2>Complete Payment</h2>
          <button onClick={onCancel} style={styles.closeBtn}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.modalBody}>
            <div style={styles.bookingInfo}>
              <p><strong>Service:</strong> {booking.serviceName}</p>
              <p><strong>Provider:</strong> {booking.providerId?.businessName || booking.providerId?.firstName}</p>
              <p><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()} at {booking.bookingTime}</p>
            </div>
            
            {/* Promo Code Input */}
            <PromoCodeInput 
              amount={amount}
              bookingId={booking._id}
              onDiscountApplied={(discount, total) => {
                setDiscountAmount(discount);
                setFinalAmount(total);
              }}
            />
            
            <div style={styles.paymentMethodSection}>
              <label style={styles.label}>Payment Method</label>
              <div style={styles.methodOptions}>
                <label style={styles.methodOption}>
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  💳 Credit / Debit Card
                </label>
                <label style={styles.methodOption}>
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  💵 Pay at Shop (Cash)
                </label>
              </div>
            </div>
            
            {paymentMethod === 'card' && (
              <div style={styles.cardSection}>
                <label style={styles.label}>Card Details</label>
                <div style={styles.cardElement}>
                  <CardElement options={cardElementOptions} />
                </div>
                <p style={styles.secureNote}>🔒 Secure payment powered by Stripe</p>
              </div>
            )}
            
            <div style={styles.totalSection}>
              <div style={styles.totalRow}>
                <span>Original Amount:</span>
                <span>${amount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={styles.discountRow}>
                  <span>Discount:</span>
                  <span style={{ color: '#10b981' }}>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={styles.finalRow}>
                <span><strong>Total to Pay:</strong></span>
                <span style={styles.finalAmount}>${finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style={styles.modalFooter}>
            <button type="button" style={styles.cancelBtn} onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              style={styles.payBtn} 
              disabled={processing || (paymentMethod === 'card' && !stripe)}
            >
              {processing ? 'Processing...' : `Pay $${finalAmount.toFixed(2)}`}
            </button>
          </div>
        </form>
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
    maxHeight: '90vh',
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
  bookingInfo: {
    backgroundColor: '#f3e8ff',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px'
  },
  paymentMethodSection: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '500' },
  methodOptions: { display: 'flex', gap: '20px' },
  methodOption: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  cardSection: { marginTop: '15px' },
  cardElement: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white'
  },
  secureNote: { fontSize: '11px', color: '#6b7280', marginTop: '8px' },
  totalSection: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb'
  },
  totalRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  discountRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  finalRow: { display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e5e7eb' },
  finalAmount: { fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  payBtn: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default PaymentModal;
