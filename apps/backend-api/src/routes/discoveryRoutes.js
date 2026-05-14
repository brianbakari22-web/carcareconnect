const express = require('express');
const router = express.Router();
const {
  getAllProviders,
  getProviderDetails,
  getAllDrivers,
  getDriverDetails,
  getAllServicesWithProviders,
  getDiscoveryStats
} = require('../controllers/discoveryController');

// Public discovery routes (no authentication required)
router.get('/providers', getAllProviders);
router.get('/providers/:id', getProviderDetails);
router.get('/drivers', getAllDrivers);
router.get('/drivers/:id', getDriverDetails);
router.get('/services', getAllServicesWithProviders);
router.get('/stats', getDiscoveryStats);

module.exports = router;
