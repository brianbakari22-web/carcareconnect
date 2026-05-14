import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function LoyaltyWidget({ userId }) {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    fetchLoyalty();
  }, []);
  
  const fetchLoyalty = async () => {
    try {
      const res = await fetch('https://carcareconnect-backend.onrender.com/api/loyalty/my-points', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLoyalty(data.loyalty);
      }
    } catch (error) {
      console.error('Error fetching loyalty:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const redeemPoints = async () => {
    const points = parseInt(redeemAmount);
    if (isNaN(points) || points <= 0) {
      toast.error('Please enter valid points');
      return;
    }
    
    try {
      const res = await fetch('https://carcareconnect-backend.onrender.com/api/loyalty/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ points })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Redeemed ${points} points for $${data.discount} discount!`);
        setShowRedeemModal(false);
        setRedeemAmount('');
        fetchLoyalty();
      } else {
        toast.error(data.error || 'Failed to redeem points');
      }
    } catch (error) {
      toast.error('Failed to redeem points');
    }
  };
  
  const getTierColor = (tier) => {
    switch(tier) {
      case 'Platinum': return '#94a3b8';
      case 'Gold': return '#f59e0b';
      case 'Silver': return '#9ca3af';
      default: return '#cd7f32';
    }
  };
  
  const getNextTier = (points) => {
    if (points < 1000) return { name: 'Silver', pointsNeeded: 1000 - points };
    if (points < 5000) return { name: 'Gold', pointsNeeded: 5000 - points };
    if (points < 10000) return { name: 'Platinum', pointsNeeded: 10000 - points };
    return { name: 'Max', pointsNeeded: 0 };
  };
  
  if (loading) {
    return <div style={styles.card}>Loading loyalty points...</div>;
  }
  
  if (!loyalty) {
    return null;
  }
  
  const nextTier = getNextTier(loyalty.lifetimePoints);
  const progressPercent = (loyalty.lifetimePoints / 10000) * 100;
  
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>💎</span>
        <span style={styles.title}>Loyalty Program</span>
      </div>
      
      <div style={styles.pointsDisplay}>
        <div style={styles.pointsValue}>{loyalty.points}</div>
        <div style={styles.pointsLabel}>Available Points</div>
      </div>
      
      <div style={styles.tierSection}>
        <div style={styles.tierBadge}>
          <span style={{ color: getTierColor(loyalty.tier) }}>◆</span>
          {loyalty.tier} Tier
        </div>
        <div style={styles.lifetimePoints}>
          {loyalty.lifetimePoints} lifetime points
        </div>
      </div>
      
      {nextTier.pointsNeeded > 0 && (
        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>
            <span>{nextTier.pointsNeeded} points to {nextTier.name}</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${Math.min(progressPercent, 100)}%` }}></div>
          </div>
        </div>
      )}
      
      <div style={styles.redeemSection}>
        <div style={styles.redeemInfo}>
          <span>💎 100 points = $1 discount</span>
        </div>
        <button 
          style={styles.redeemBtn} 
          onClick={() => setShowRedeemModal(true)}
          disabled={loyalty.points < 100}
        >
          Redeem Points
        </button>
      </div>
      
      {/* Recent Transactions */}
      {loyalty.transactions && loyalty.transactions.length > 0 && (
        <div style={styles.transactions}>
          <div style={styles.transactionsTitle}>Recent Activity</div>
          {loyalty.transactions.slice(0, 3).map((t, idx) => (
            <div key={idx} style={styles.transactionItem}>
              <span style={t.type === 'earn' ? styles.earnText : styles.redeemText}>
                {t.type === 'earn' ? '+' : '-'}{t.points}
              </span>
              <span style={styles.transactionDesc}>{t.description}</span>
              <span style={styles.transactionDate}>{new Date(t.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Redeem Modal */}
      {showRedeemModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Redeem Points</h3>
              <button onClick={() => setShowRedeemModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <p>Available Points: <strong>{loyalty.points}</strong></p>
              <p>100 points = $1 discount</p>
              <input
                type="number"
                placeholder="Enter points to redeem"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                style={styles.input}
              />
              <p style={styles.redeemNote}>Discount will be applied to your next booking</p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowRedeemModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={redeemPoints} style={styles.submitBtn}>Redeem</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
  icon: { fontSize: '24px' },
  title: { fontSize: '16px', fontWeight: 'bold' },
  pointsDisplay: { textAlign: 'center', marginBottom: '15px' },
  pointsValue: { fontSize: '36px', fontWeight: 'bold', color: '#8b5cf6' },
  pointsLabel: { fontSize: '12px', color: '#6b7280' },
  tierSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  tierBadge: { backgroundColor: '#f3e8ff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' },
  lifetimePoints: { fontSize: '12px', color: '#6b7280' },
  progressSection: { marginBottom: '15px' },
  progressLabel: { fontSize: '11px', color: '#6b7280', marginBottom: '5px' },
  progressBar: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#8b5cf6', borderRadius: '3px' },
  redeemSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
  redeemInfo: { fontSize: '12px', color: '#6b7280' },
  redeemBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  transactions: { marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' },
  transactionsTitle: { fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' },
  transactionItem: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '5px 0' },
  earnText: { color: '#10b981', fontWeight: 'bold' },
  redeemText: { color: '#ef4444', fontWeight: 'bold' },
  transactionDesc: { color: '#6b7280', flex: 1, marginLeft: '10px' },
  transactionDate: { color: '#9ca3af' },
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
    width: '400px',
    maxWidth: '90%'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #e5e7eb'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' },
  modalBody: { padding: '20px' },
  input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '10px' },
  redeemNote: { fontSize: '11px', color: '#6b7280', marginTop: '10px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px 20px', borderTop: '1px solid #e5e7eb' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  submitBtn: { padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }
};

export default LoyaltyWidget;
