import React, { useEffect, useRef, useState } from 'react';

function DriverMap({ driverLocation, pickupLocation, driverName }) {
  const [map, setMap] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [pickupMarker, setPickupMarker] = useState(null);
  const [routeLayer, setRouteLayer] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);

  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    // Add Leaflet CSS
    if (!document.querySelector('#leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Add Leaflet JS
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initMap();
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.L) return;

    const center = driverLocation 
      ? [driverLocation.lat, driverLocation.lng]
      : [-1.286389, 36.817223];

    const newMap = window.L.map(mapRef.current).setView(center, 13);
    
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(newMap);

    setMap(newMap);
    leafletRef.current = window.L;
  };

  // Update driver marker when location changes
  useEffect(() => {
    if (!map || !leafletRef.current || !driverLocation) return;

    if (driverMarker) driverMarker.remove();

    const driverIcon = leafletRef.current.divIcon({
      html: '<div style="font-size: 28px;">🚗</div>',
      iconSize: [30, 30],
      className: 'driver-marker'
    });

    const newDriverMarker = leafletRef.current.marker(
      [driverLocation.lat, driverLocation.lng],
      { icon: driverIcon, title: driverName || 'Driver' }
    ).addTo(map);

    setDriverMarker(newDriverMarker);
    map.panTo([driverLocation.lat, driverLocation.lng]);
  }, [driverLocation, map]);

  // Add pickup marker and calculate route
  useEffect(() => {
    if (!map || !leafletRef.current || !pickupLocation) return;

    if (pickupMarker) pickupMarker.remove();

    // Geocode pickup address using Nominatim (OpenStreetMap geocoder)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupLocation)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          const pickupIcon = leafletRef.current.divIcon({
            html: '<div style="font-size: 28px;">📍</div>',
            iconSize: [30, 30],
            className: 'pickup-marker'
          });

          const newPickupMarker = leafletRef.current.marker(
            [lat, lng],
            { icon: pickupIcon, title: 'Pickup Location' }
          ).addTo(map);

          setPickupMarker(newPickupMarker);

          // Draw route if driver location exists
          if (driverLocation) {
            drawRoute(driverLocation.lat, driverLocation.lng, lat, lng);
          }
        }
      })
      .catch(err => console.error('Geocoding error:', err));
  }, [pickupLocation, driverLocation, map]);

  const drawRoute = (startLat, startLng, endLat, endLng) => {
    if (routeLayer) routeLayer.remove();

    // Use OpenRouteService or OSRM for routing (free)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    
    fetch(osrmUrl)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceMeters = route.distance;
          const durationSeconds = route.duration;
          
          setDistance((distanceMeters / 1609.34).toFixed(1)); // Convert to miles
          setDuration(Math.ceil(durationSeconds / 60)); // Convert to minutes

          const geojson = {
            type: 'Feature',
            geometry: route.geometry
          };

          const newRouteLayer = leafletRef.current.geoJSON(geojson, {
            style: {
              color: '#8b5cf6',
              weight: 5,
              opacity: 0.8
            }
          }).addTo(map);

          setRouteLayer(newRouteLayer);
          
          // Fit bounds to show the entire route
          const bounds = leafletRef.current.latLngBounds(
            [startLat, startLng],
            [endLat, endLng]
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      })
      .catch(err => console.error('Routing error:', err));
  };

  if (!driverLocation || !driverLocation.lat) {
    return (
      <div style={styles.placeholder}>
        <div style={styles.spinner}>📍</div>
        <div>Waiting for driver location...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.driverInfo}>
          <span style={styles.carIcon}>🚗</span>
          <div>
            <div style={styles.driverName}>{driverName || 'Your Driver'}</div>
            {distance && duration && (
              <div style={styles.etaInfo}>
                📍 {distance} miles • ⏱️ {duration} min
              </div>
            )}
          </div>
        </div>
        <a 
          href={`https://www.openstreetmap.org/directions?from=${driverLocation.lat}%2C${driverLocation.lng}&to=${encodeURIComponent(pickupLocation || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.openMapsBtn}
        >
          Open in OpenStreetMap →
        </a>
      </div>
      <div ref={mapRef} style={styles.map} />
      <div style={styles.footer}>
        <div style={styles.updateTime}>
          Last update: {new Date(driverLocation.lastUpdate).toLocaleTimeString()}
        </div>
        <div style={styles.liveBadge}>🟢 Live Tracking</div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    marginTop: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    padding: '12px 15px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  driverInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  carIcon: { fontSize: '24px' },
  driverName: { fontWeight: 'bold', fontSize: '14px' },
  etaInfo: { fontSize: '11px', color: '#6b7280' },
  openMapsBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '12px'
  },
  map: { height: '250px', width: '100%', backgroundColor: '#f0f0f0' },
  footer: {
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#6b7280'
  },
  liveBadge: { color: '#10b981', fontWeight: 'bold' },
  placeholder: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    color: '#6b7280'
  },
  spinner: { fontSize: '32px', marginBottom: '10px' }
};

export default DriverMap;
