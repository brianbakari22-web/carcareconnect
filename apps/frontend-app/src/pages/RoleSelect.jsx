import React, { useState } from 'react';

function RoleSelect({ onSelectRole }) {
  const [hoveredRole, setHoveredRole] = useState(null);

  const roles = [
    {
      id: 'customer',
      title: 'Customer',
      icon: '🚗',
      description: 'Book services, track drivers, earn loyalty points',
      features: ['🔧 Browse Services', '📍 Live Tracking', '💎 Loyalty Rewards', '⭐ Rate Experience']
    },
    {
      id: 'provider',
      title: 'Service Provider',
      icon: '🔧',
      description: 'List services, manage bookings, grow your business',
      features: ['📊 Analytics Dashboard', '💰 Instant Payouts', '📅 Booking Management', '⭐ Customer Reviews']
    },
    {
      id: 'driver',
      title: 'Driver',
      icon: '🚚',
      description: 'Earn by delivering vehicles, set your own schedule',
      features: ['📍 GPS Tracking', '💵 $20 Per Delivery', '📈 Earnings Dashboard', '✅ Flexible Hours']
    }
  ];

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    },
    bgCircle1: {
      position: 'absolute',
      top: '-10%',
      right: '-5%',
      width: '500px',
      height: '500px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.1)',
      animation: 'float 20s infinite'
    },
    bgCircle2: {
      position: 'absolute',
      bottom: '-10%',
      left: '-5%',
      width: '600px',
      height: '600px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.05)',
      animation: 'float 25s infinite reverse'
    },
    content: {
      position: 'relative',
      zIndex: 10,
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '40px 20px'
    },
    header: {
      textAlign: 'center',
      marginBottom: '60px',
      animation: 'fadeInDown 0.8s ease-out'
    },
    logo: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      background: 'rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)',
      padding: '12px 24px',
      borderRadius: '60px',
      marginBottom: '30px'
    },
    logoIcon: { fontSize: '32px' },
    logoText: { fontSize: '24px', fontWeight: 'bold', color: 'white' },
    tagline: { fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginTop: '8px' },
    mainTitle: {
      fontSize: '48px',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '16px',
      lineHeight: 1.2
    },
    highlight: {
      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    },
    subtitle: { 
      fontSize: '18px', 
      color: 'rgba(255,255,255,0.85)', 
      maxWidth: '600px', 
      margin: '0 auto' 
    },
    rolesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginBottom: '60px'
    },
    roleCard: (roleId) => ({
      background: 'rgba(255,255,255,0.95)',
      borderRadius: '24px',
      padding: '28px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      transform: hoveredRole === roleId ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      boxShadow: hoveredRole === roleId 
        ? '0 25px 40px -12px rgba(0,0,0,0.25)' 
        : '0 10px 25px -5px rgba(0,0,0,0.1)',
      border: hoveredRole === roleId ? '2px solid #8b5cf6' : 'none'
    }),
    roleIcon: { fontSize: '48px', marginBottom: '16px' },
    roleTitle: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '12px' },
    roleDescription: { fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.5 },
    featureList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', justifyContent: 'center' },
    featureBadge: {
      background: '#f3f4f6',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      color: '#374151'
    },
    visionMission: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '32px',
      marginBottom: '60px',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '32px',
      padding: '40px'
    },
    vmCard: { textAlign: 'center' },
    vmIcon: { fontSize: '48px', marginBottom: '16px' },
    vmTitle: { fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' },
    vmText: { fontSize: '16px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 },
    stats: {
      display: 'flex',
      justifyContent: 'space-around',
      flexWrap: 'wrap',
      gap: '32px',
      marginBottom: '40px'
    },
    statItem: { textAlign: 'center' },
    statNumber: { fontSize: '32px', fontWeight: 'bold', color: 'white' },
    statLabel: { fontSize: '14px', color: 'rgba(255,255,255,0.8)' },
    footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }
  };

  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes float {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        50% { transform: translate(20px, 20px) rotate(10deg); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .role-card {
        animation: fadeInUp 0.5s ease-out forwards;
        opacity: 0;
      }
      .role-card:nth-child(1) { animation-delay: 0.1s; }
      .role-card:nth-child(2) { animation-delay: 0.2s; }
      .role-card:nth-child(3) { animation-delay: 0.3s; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.bgCircle1}></div>
      <div style={styles.bgCircle2}></div>
      
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🚗💨</span>
            <span style={styles.logoText}>Car Care Connect</span>
          </div>
          <div style={styles.tagline}>Africa's Most Trusted Auto Care Network</div>
          <h1 style={styles.mainTitle}>
            Your Car, <span style={styles.highlight}>Our Care</span>
          </h1>
          <p style={styles.subtitle}>
            Connect with trusted service providers, track your vehicle in real-time, 
            and earn rewards on every service
          </p>
        </div>

        {/* Role Cards */}
        <div style={styles.rolesGrid}>
          {roles.map(role => (
            <div
              key={role.id}
              className="role-card"
              style={styles.roleCard(role.id)}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              onClick={() => onSelectRole(role.id)}
            >
              <div style={styles.roleIcon}>{role.icon}</div>
              <h3 style={styles.roleTitle}>{role.title}</h3>
              <p style={styles.roleDescription}>{role.description}</p>
              <div style={styles.featureList}>
                {role.features.map((feature, idx) => (
                  <span key={idx} style={styles.featureBadge}>{feature}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Vision & Mission Section */}
        <div style={styles.visionMission}>
          <div style={styles.vmCard}>
            <div style={styles.vmIcon}>🌟</div>
            <h2 style={styles.vmTitle}>Our Vision</h2>
            <p style={styles.vmText}>
              "To become Africa's most trusted digital ecosystem for automotive care, 
              connecting every vehicle owner with reliable service providers at the click of a button."
            </p>
          </div>
          <div style={styles.vmCard}>
            <div style={styles.vmIcon}>🎯</div>
            <h2 style={styles.vmTitle}>Our Mission</h2>
            <p style={styles.vmText}>
              "Empowering vehicle owners and service providers through technology by simplifying 
              car maintenance, connecting customers with verified professionals, ensuring transparent 
              pricing, and building a community of automotive excellence across Africa."
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>500+</div>
            <div style={styles.statLabel}>Trusted Providers</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>10,000+</div>
            <div style={styles.statLabel}>Happy Customers</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>50,000+</div>
            <div style={styles.statLabel}>Services Completed</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statNumber}>4.8/5</div>
            <div style={styles.statLabel}>Average Rating</div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p>© 2026 Car Care Connect | Drive Confidently, Service Simply</p>
         <p style={{ marginTop: '8px' }}>📍 Nairobi, Kenya | 📧 carcareconnect254@gmail.com | 📞 0113858966</p>        </div>
      </div>
    </div>
  );
}

export default RoleSelect;
