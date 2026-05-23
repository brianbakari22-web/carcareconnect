import React, { useState } from 'react';
import { toast } from 'react-toastify';

function PromoCodeInput({ amount, onDiscountApplied, bookingId }) {
  const [promoCode, setPromoCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [discount, setDiscount] = useState(null);
  const [error, setError] = useState(null);
  
  const token = localStorage.getItem('token');
  
  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    
    setApplying(true);
    setError(null);
    
    try {
      // First validate the promo code
      const validateRes = await fetch('https://carcare-api.brianbakari22.workers.dev/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          amount: amount,
          role: 'customer'
        })
      });
      
      const validateData = await validateRes.json();
      
      if (!validateData.success) {
        setError(validateData.error);
        toast.error(validateData.error);
        setApplying(false);
        return;
      }
      
      // Apply to booking if bookingId exists
      if (bookingId) {
        const applyRes = await fetch('https://carcare-api.brianbakari22.workers.dev/api/promo/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bookingId: bookingId,
            code: promoCode
          })
        });
        
        const applyData = await applyRes.json();
        if (applyData.success) {
          setDiscount(applyData);
          toast.success(`Promo code applied! You saved $${applyData.discountAmount}`);
          if (onDiscountApplied) {
            onDiscountApplied(applyData.discountAmount, applyData.discountedTotal);
          }
        } else {
          setError(applyData.error);
          toast.error(applyData.error);
        }
      } else {
        // Just show the discount without applying to booking
        setDiscount(validateData.promoCode);
        toast.success(`Promo code valid! You save $${validateData.promoCode.discountAmount}`);
        if (onDiscountApplied) {
          onDiscountApplied(validateData.promoCode.discountAmount, validateData.promoCode.finalAmount);
        }
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast.error('Failed to apply promo code');
    } finally {
      setApplying(false);
    }
  };
  
  const removePromoCode = () => {
    setDiscount(null);
    setPromoCode('');
    setError(null);
    if (onDiscountApplied) {
      onDiscountApplied(0, amount);
    }
    toast.info('Promo code removed');
  };
  
  return (
    <div style={styles.container}>
      <label style={styles.label}>Promo Code</label>
      {!discount ? (
        <div style={styles.inputGroup}>
          <input
            type="text"
            style={styles.input}
            placeholder="Enter promo code (e.g., WELCOME20)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            disabled={applying}
          />
          <button 
            style={styles.applyBtn} 
            onClick={applyPromoCode}
            disabled={applying || !promoCode.trim()}
          >
            {applying ? 'Applying...' : 'Apply'}
          </button>
        </div>
      ) : (
        <div style={styles.appliedBox}>
          <div style={styles.appliedInfo}>
            <span style={styles.discountIcon}>🎟️</span>
            <div>
              <div style={styles.appliedCode}>Code: {promoCode}</div>
              <div style={styles.discountAmount}>Saved: ${discount.discountAmount || discount.discountAmount}</div>
            </div>
          </div>
          <button style={styles.removeBtn} onClick={removePromoCode}>
            Remove
          </button>
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}
      {discount && discount.discountedTotal && (
        <div style={styles.priceBreakdown}>
          <div style={styles.originalPrice}>Original: ${amount}</div>
          <div style={styles.discountLine}>Discount: -${discount.discountAmount}</div>
          <div style={styles.finalPrice}>Total: ${discount.discountedTotal}</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '500' },
  inputGroup: { display: 'flex', gap: '10px' },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  applyBtn: {
    padding: '10px 20px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  appliedBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#d1fae5',
    borderRadius: '6px'
  },
  appliedInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  discountIcon: { fontSize: '20px' },
  appliedCode: { fontWeight: 'bold', color: '#065f46' },
  discountAmount: { fontSize: '12px', color: '#065f46' },
  removeBtn: {
    padding: '4px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  error: { marginTop: '8px', fontSize: '12px', color: '#ef4444' },
  priceBreakdown: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    fontSize: '13px'
  },
  originalPrice: { textDecoration: 'line-through', color: '#6b7280' },
  discountLine: { color: '#10b981' },
  finalPrice: { fontWeight: 'bold', marginTop: '5px', color: '#1f2937' }
};

export default PromoCodeInput;
