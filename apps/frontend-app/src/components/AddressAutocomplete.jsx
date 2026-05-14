import React, { useRef, useState, useEffect } from 'react';
import { LoadScript } from '@react-google-maps/api';

const libraries = ['places'];

function AddressAutocomplete({ onSelect, placeholder, value, required }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (window.google && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, []);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }

    if (value.length > 2 && autocompleteServiceRef.current) {
      try {
        const response = await autocompleteServiceRef.current.getPlacePredictions({
          input: value,
          sessionToken: sessionTokenRef.current,
          componentRestrictions: { country: 'ke' } // Change to your country
        });
        
        setSuggestions(response.predictions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Get place details
    if (window.google && sessionTokenRef.current) {
      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      placesService.getDetails(
        {
          placeId: suggestion.place_id,
          sessionToken: sessionTokenRef.current
        },
        (place, status) => {
          if (status === 'OK' && place) {
            onSelect({
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              placeId: place.place_id
            });
          }
        }
      );
    }
    
    // Reset session token for next search
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div style={styles.container}>
      <input
        ref={inputRef}
        type="text"
        style={styles.input}
        placeholder={placeholder || 'Enter address...'}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        required={required}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionsContainer}>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.place_id}
              style={styles.suggestionItem}
              onMouseDown={() => handleSelectSuggestion(suggestion)}
            >
              <div style={styles.suggestionMain}>{suggestion.structured_formatting?.main_text}</div>
              <div style={styles.suggestionSecondary}>{suggestion.structured_formatting?.secondary_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { position: 'relative', width: '100%' },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px'
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 1000,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  suggestionItem: {
    padding: '10px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    ':hover': { backgroundColor: '#f3f4f6' }
  },
  suggestionMain: { fontSize: '14px', fontWeight: '500' },
  suggestionSecondary: { fontSize: '11px', color: '#6b7280' }
};

export default AddressAutocomplete;
