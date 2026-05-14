import React, { useState, useEffect } from 'react';

function DiscoveryPage({ user, onBack }) {
  const [activeSubTab, setActiveSubTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchDiscoveryData();
  }, []);

  const fetchDiscoveryData = async () => {
    setLoading(true);
    try {
      // Fetch providers
      const providersRes = await fetch('https://carcareconnect-backend.onrender.com/api/discovery/providers');
      const providersData = await providersRes.json();
      if (providersData.success) setProviders(providersData.providers);

      // Fetch drivers
      const driversRes = await fetch('https://carcareconnect-backend.onrender.com/api/discovery/drivers');
      const driversData = await driversRes.json();
      if (driversData.success) setDrivers(driversData);

      // Fetch services
      const servicesRes = await fetch('https://carcareconnect-backend.onrender.com/api/discovery/services');
      const servicesData = await servicesRes.json();
      if (servicesData.success) setServices(servicesData.services);

      // Fetch stats
      const statsRes = await fetch('https://carcareconnect-backend.onrender.com/api/discovery/stats');
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);
    } catch (error) {
      console.error('Error fetching discovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderDetails = async (providerId) => {
    try {
      const res = await fetch(`https://carcareconnect-backend.onrender.com/api/discovery/providers/${providerId}`);
      const data = await res.json();
      if (data.success) setSelectedProvider(data);
    } catch (error) {
      console.error('Error fetching provider details:', error);
    }
  };

  const getDriverDetails = async (driverId) => {
    try {
      const res = await fetch(`https://carcareconnect-backend.onrender.com/api/discovery/drivers/${driverId}`);
      const data = await res.json();
      if (data.success) setSelectedDriver(data);
    } catch (error) {
      console.error('Error fetching driver details:', error);
    }
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.businessAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrivers = drivers.onlineDrivers?.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(services.map(s => s.category))];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back to Dashboard</button>
        <h1 style={styles.title}>🔍 Discover</h1>
      </div>

      {/* Stats Banner */}
      <div style={styles.statsBanner}>
        <div style={styles.statItem}>
          <span>🔧</span>
          <div>
            <strong>{stats.totalProviders || 0}</strong>
            <small>Trusted Providers</small>
          </div>
        </div>
        <div style={styles.statItem}>
          <span>🚗</span>
          <div>
            <strong>{stats.totalDrivers || 0}</strong>
            <small>Professional Drivers</small>
          </div>
        </div>
        <div style={styles.statItem}>
          <span>🛠️</span>
          <div>
            <strong>{stats.totalServices || 0}</strong>
            <small>Services Available</small>
          </div>
        </div>
        <div style={styles.statItem}>
          <span>⭐</span>
          <div>
            <strong>{stats.averageRating || 4.8}</strong>
            <small>Avg Rating</small>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={styles.subTabs}>
        <button style={{...styles.subTab, ...(activeSubTab === 'providers' ? styles.activeSubTab : {})}} onClick={() => setActiveSubTab('providers')}>
          🔧 Providers ({providers.length})
        </button>
        <button style={{...styles.subTab, ...(activeSubTab === 'drivers' ? styles.activeSubTab : {})}} onClick={() => setActiveSubTab('drivers')}>
          🚗 Drivers ({drivers.onlineCount || 0} online)
        </button>
        <button style={{...styles.subTab, ...(activeSubTab === 'services' ? styles.activeSubTab : {})}} onClick={() => setActiveSubTab('services')}>
          🛠️ Services ({services.length})
        </button>
      </div>

      {/* Search Bar */}
      <div style={styles.searchBar}>
        <input 
          type="text" 
          placeholder={`Search ${activeSubTab}...`} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {activeSubTab === 'services' && (
          <select style={styles.categorySelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? <div style={styles.loading}>Loading...</div> : (
          <>
            {/* Providers Tab */}
            {activeSubTab === 'providers' && (
              <div style={styles.providersGrid}>
                {filteredProviders.map(provider => (
                  <div key={provider.id} style={styles.providerCard} onClick={() => getProviderDetails(provider.id)}>
                    <div style={styles.providerLogo}>
                      <img src={provider.logo} alt={provider.name} style={styles.logoImage} />
                    </div>
                    <div style={styles.providerInfo}>
                      <h3>{provider.name}</h3>
                      <div style={styles.providerRating}>
                        <span>⭐ {provider.rating}</span>
                        <span>({provider.totalReviews} reviews)</span>
                      </div>
                      <div style={styles.providerStats}>
                        <span>🔧 {provider.totalServices} services</span>
                        <span>✅ {provider.isVerified ? 'Verified' : 'Pending'}</span>
                      </div>
                      <button style={styles.viewBtn}>View Profile →</button>
                    </div>
                  </div>
                ))}
                {filteredProviders.length === 0 && <div style={styles.emptyState}>No providers found</div>}
              </div>
            )}

            {/* Drivers Tab */}
            {activeSubTab === 'drivers' && (
              <div>
                <div style={styles.onlineBadge}>
                  🟢 {drivers.onlineCount || 0} Drivers Online Now
                </div>
                <div style={styles.driversGrid}>
                  {filteredDrivers.map(driver => (
                    <div key={driver.id} style={styles.driverCard} onClick={() => getDriverDetails(driver.id)}>
                      <div style={styles.driverAvatar}>
                        <img src={driver.avatar} alt={driver.name} style={styles.avatarImage} />
                        <span style={{...styles.onlineDot, backgroundColor: driver.isOnline ? '#10b981' : '#6b7280'}}></span>
                      </div>
                      <div style={styles.driverInfo}>
                        <h3>{driver.name}</h3>
                        <div style={styles.driverRating}>
                          <span>⭐ {driver.rating}</span>
                          <span>📦 {driver.totalDeliveries} deliveries</span>
                        </div>
                        <div style={styles.driverVehicle}>
                          🚗 {driver.vehicle}
                        </div>
                        <button style={styles.viewBtn}>View Profile →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeSubTab === 'services' && (
              <div style={styles.servicesGrid}>
                {filteredServices.map(service => (
                  <div key={service.id} style={styles.serviceCard}>
                    <div style={styles.serviceHeader}>
                      <h3>{service.name}</h3>
                      {service.discountedPrice && <span style={styles.discountBadge}>-{Math.round((1 - service.discountedPrice/service.price) * 100)}%</span>}
                    </div>
                    <p style={styles.serviceDesc}>{service.description.substring(0, 100)}...</p>
                    <div style={styles.serviceProvider}>
                      <span>🔧 {service.provider.name}</span>
                      <span>⭐ {service.rating}</span>
                    </div>
                    <div style={styles.servicePrice}>
                      <span style={styles.price}>${service.price}</span>
                      <span style={styles.duration}>⏱️ {service.duration} min</span>
                    </div>
                    <button style={styles.bookBtn}>Book Now</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Provider Modal */}
      {selectedProvider && (
        <div style={styles.modal} onClick={() => setSelectedProvider(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedProvider(null)}>✕</button>
            <div style={styles.modalHeader}>
              <img src={selectedProvider.provider.logo} alt={selectedProvider.provider.name} style={styles.modalLogo} />
              <div>
                <h2>{selectedProvider.provider.name}</h2>
                <div style={styles.modalRating}>⭐ {selectedProvider.provider.rating} ({selectedProvider.provider.totalReviews} reviews)</div>
                <div style={styles.modalVerified}>{selectedProvider.provider.isVerified ? '✅ Verified Provider' : '⏳ Pending Verification'}</div>
              </div>
            </div>
            <div style={styles.modalBody}>
              <p><strong>📍 Address:</strong> {selectedProvider.provider.address || 'Not specified'}</p>
              <p><strong>📧 Email:</strong> {selectedProvider.provider.email}</p>
              <p><strong>📞 Phone:</strong> {selectedProvider.provider.phone}</p>
              <p><strong>📅 Member since:</strong> {new Date(selectedProvider.provider.memberSince).toLocaleDateString()}</p>
              
              <h3>🛠️ Services Offered ({selectedProvider.totalServices})</h3>
              <div style={styles.modalServices}>
                {selectedProvider.services?.map(service => (
                  <div key={service._id} style={styles.modalService}>
                    <div>
                      <strong>{service.name}</strong>
                      <p>{service.description?.substring(0, 80)}</p>
                    </div>
                    <div style={styles.modalServicePrice}>${service.price}</div>
                  </div>
                ))}
              </div>

              <h3>⭐ Customer Reviews</h3>
              <div style={styles.modalReviews}>
                {selectedProvider.reviews?.map((review, idx) => (
                  <div key={idx} style={styles.modalReview}>
                    <div style={styles.reviewHeader}>
                      <strong>{review.customerName}</strong>
                      <span>⭐ {review.rating}</span>
                    </div>
                    <p>{review.review}</p>
                    <small>{new Date(review.date).toLocaleDateString()}</small>
                  </div>
                ))}
                {selectedProvider.reviews?.length === 0 && <p>No reviews yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Modal */}
      {selectedDriver && (
        <div style={styles.modal} onClick={() => setSelectedDriver(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedDriver(null)}>✕</button>
            <div style={styles.modalHeader}>
              <img src={selectedDriver.driver.avatar} alt={selectedDriver.driver.name} style={styles.modalLogo} />
              <div>
                <h2>{selectedDriver.driver.name}</h2>
                <div style={styles.modalRating}>⭐ {selectedDriver.driver.rating} ({selectedDriver.driver.totalDeliveries} deliveries)</div>
                <div style={{...styles.modalVerified, backgroundColor: selectedDriver.driver.isOnline ? '#d1fae5' : '#f3f4f6', color: selectedDriver.driver.isOnline ? '#065f46' : '#6b7280'}}>
                  {selectedDriver.driver.isOnline ? '🟢 Online' : '⚫ Offline'}
                </div>
              </div>
            </div>
            <div style={styles.modalBody}>
              <p><strong>🚗 Vehicle:</strong> {selectedDriver.driver.vehicleColor} {selectedDriver.driver.vehicleModel}</p>
              <p><strong>🔢 License Plate:</strong> {selectedDriver.driver.vehiclePlate}</p>
              <p><strong>📞 Phone:</strong> {selectedDriver.driver.phone}</p>
              <p><strong>📧 Email:</strong> {selectedDriver.driver.email}</p>
              
              <h3>📦 Recent Deliveries</h3>
              <div style={styles.modalDeliveries}>
                {selectedDriver.driver.recentDeliveries?.map((delivery, idx) => (
                  <div key={idx} style={styles.modalDelivery}>
                    <span>{delivery.serviceName}</span>
                    <span>{new Date(delivery.completedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  backButton: { backgroundColor: '#f3f4f6', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  title: { fontSize: '28px', color: '#1f2937', margin: 0 },
  statsBanner: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' },
  statItem: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  subTabs: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' },
  subTab: { padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  activeSubTab: { borderBottom: '2px solid #2563eb', color: '#2563eb' },
  searchBar: { display: 'flex', gap: '15px', marginBottom: '20px' },
  searchInput: { flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px' },
  categorySelect: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', width: '150px' },
  content: { minHeight: '400px' },
  loading: { textAlign: 'center', padding: '50px' },
  providersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
  providerCard: { display: 'flex', gap: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s' },
  providerLogo: { width: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%', objectFit: 'cover' },
  providerInfo: { flex: 1 },
  providerRating: { display: 'flex', gap: '10px', fontSize: '13px', color: '#6b7280', margin: '5px 0' },
  providerStats: { display: 'flex', gap: '15px', fontSize: '12px', color: '#6b7280' },
  viewBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', marginTop: '8px', fontSize: '12px' },
  onlineBadge: { backgroundColor: '#d1fae5', color: '#065f46', padding: '8px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '20px' },
  driversGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  driverCard: { display: 'flex', gap: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  driverAvatar: { position: 'relative', width: '60px', height: '60px' },
  avatarImage: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
  onlineDot: { position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white' },
  driverInfo: { flex: 1 },
  driverRating: { display: 'flex', gap: '10px', fontSize: '12px', color: '#6b7280', margin: '5px 0' },
  driverVehicle: { fontSize: '12px', color: '#6b7280' },
  servicesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  serviceCard: { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  serviceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  discountBadge: { backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' },
  serviceDesc: { fontSize: '13px', color: '#6b7280', marginBottom: '10px' },
  serviceProvider: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '10px' },
  servicePrice: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  price: { fontSize: '18px', fontWeight: 'bold', color: '#2563eb' },
  duration: { fontSize: '12px', color: '#6b7280' },
  bookBtn: { width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto', position: 'relative' },
  closeBtn: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  modalHeader: { display: 'flex', gap: '20px', padding: '20px', borderBottom: '1px solid #e5e7eb' },
  modalLogo: { width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover' },
  modalRating: { fontSize: '14px', color: '#6b7280' },
  modalVerified: { fontSize: '12px', padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '5px' },
  modalBody: { padding: '20px' },
  modalServices: { marginTop: '15px', marginBottom: '20px' },
  modalService: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #e5e7eb' },
  modalServicePrice: { fontWeight: 'bold', color: '#2563eb' },
  modalReviews: { marginTop: '15px' },
  modalReview: { padding: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '10px' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
  modalDeliveries: { marginTop: '15px' },
  modalDelivery: { display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #e5e7eb' },
  emptyState: { textAlign: 'center', padding: '50px', color: '#6b7280' }
};

export default DiscoveryPage;
