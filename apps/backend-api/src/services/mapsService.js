const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Calculate distance and duration between two points
const getDistanceMatrix = async (origins, destinations) => {
  try {
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const response = await axios.get(url, {
      params: {
        origins: Array.isArray(origins) ? origins.join('|') : origins,
        destinations: Array.isArray(destinations) ? destinations.join('|') : destinations,
        key: GOOGLE_MAPS_API_KEY,
        units: 'imperial'
      }
    });
    
    if (response.data.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance.text,
        distanceMeters: element.distance.value,
        duration: element.duration.text,
        durationSeconds: element.duration.value,
        status: element.status
      };
    }
    return null;
  } catch (error) {
    console.error('Distance Matrix error:', error);
    return null;
  }
};

// Geocode address to coordinates
const geocodeAddress = async (address) => {
  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(url, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    }
    return null;
  } catch (error) {
    console.error('Geocode error:', error);
    return null;
  }
};

// Reverse geocode (coordinates to address)
const reverseGeocode = async (lat, lng) => {
  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(url, {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};

// Get place suggestions (autocomplete)
const getPlaceSuggestions = async (input, sessionToken) => {
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const response = await axios.get(url, {
      params: {
        input: input,
        key: GOOGLE_MAPS_API_KEY,
        sessiontoken: sessionToken,
        components: 'country:ke' // Change to your country
      }
    });
    
    if (response.data.status === 'OK') {
      return response.data.predictions.map(prediction => ({
        description: prediction.description,
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting?.main_text,
        secondaryText: prediction.structured_formatting?.secondary_text
      }));
    }
    return [];
  } catch (error) {
    console.error('Place suggestions error:', error);
    return [];
  }
};

// Get place details by placeId
const getPlaceDetails = async (placeId, sessionToken) => {
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const response = await axios.get(url, {
      params: {
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        sessiontoken: sessionToken
      }
    });
    
    if (response.data.status === 'OK') {
      const result = response.data.result;
      return {
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        name: result.name,
        phone: result.formatted_phone_number,
        website: result.website
      };
    }
    return null;
  } catch (error) {
    console.error('Place details error:', error);
    return null;
  }
};

module.exports = {
  getDistanceMatrix,
  geocodeAddress,
  reverseGeocode,
  getPlaceSuggestions,
  getPlaceDetails
};
