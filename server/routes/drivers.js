const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const { auth, requireDriver } = require('../middleware/auth');

const router = express.Router();

// Update driver online/offline status
router.put('/status', auth, requireDriver, [
  body('isOnline').isBoolean().withMessage('isOnline must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isOnline } = req.body;

    // Check if driver is approved
    if (!req.user.driverDetails?.isApproved) {
      return res.status(403).json({ message: 'Driver account not approved yet' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        'driverDetails.isOnline': isOnline,
        'driverDetails.currentLocation.lastUpdated': new Date()
      },
      { new: true }
    ).select('-password');

    // Emit status change to admin dashboard
    const io = req.app.get('io');
    io.emit('driverStatusChange', {
      driverId: user._id,
      name: user.name,
      isOnline,
      location: user.driverDetails.currentLocation
    });

    res.json({
      message: `Driver status updated to ${isOnline ? 'online' : 'offline'}`,
      isOnline: user.driverDetails.isOnline
    });
  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// Update driver location
router.put('/location', auth, requireDriver, [
  body('latitude').isNumeric().withMessage('Valid latitude is required'),
  body('longitude').isNumeric().withMessage('Valid longitude is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        'driverDetails.currentLocation': {
          latitude,
          longitude,
          lastUpdated: new Date()
        }
      },
      { new: true }
    ).select('-password');

    // Find active orders for this driver and broadcast location to customers
    const activeOrders = await Order.find({
      driver: req.userId,
      status: { $in: ['driver_assigned', 'driver_en_route', 'arrived'] }
    });

    const io = req.app.get('io');
    
    // Broadcast location to customers of active orders
    activeOrders.forEach(order => {
      io.to(`customer_${order.customer}`).emit('driverLocationUpdate', {
        orderId: order._id,
        driverId: req.userId,
        latitude,
        longitude,
        timestamp: new Date()
      });
    });

    // Also broadcast to admin dashboard
    io.emit('driverLocationUpdate', {
      driverId: req.userId,
      latitude,
      longitude,
      activeOrders: activeOrders.length
    });

    res.json({
      message: 'Location updated successfully',
      location: user.driverDetails.currentLocation
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error updating location' });
  }
});

// Get driver statistics
router.get('/stats', auth, requireDriver, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await Order.aggregate([
      {
        $match: {
          driver: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] }
          },
          totalFuelDelivered: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$quantity', 0] }
          }
        }
      }
    ]);

    const driverStats = stats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalEarnings: 0,
      totalFuelDelivered: 0
    };

    // Calculate completion rate
    driverStats.completionRate = driverStats.totalOrders > 0 
      ? ((driverStats.completedOrders / driverStats.totalOrders) * 100).toFixed(2)
      : 0;

    // Get current rating
    driverStats.currentRating = req.user.driverDetails.rating || 0;
    driverStats.totalRatings = req.user.driverDetails.totalRatings || 0;

    res.json({
      stats: driverStats,
      period: `${period} days`
    });
  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// Get earnings breakdown
router.get('/earnings', auth, requireDriver, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFilter = {
        createdAt: {
          $gte: firstDay,
          $lte: lastDay
        }
      };
    }

    const earnings = await Order.aggregate([
      {
        $match: {
          driver: req.user._id,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyEarnings: { $sum: '$totalAmount' },
          ordersCompleted: { $sum: 1 },
          fuelDelivered: { $sum: '$quantity' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const totalEarnings = earnings.reduce((sum, day) => sum + day.dailyEarnings, 0);
    const totalOrders = earnings.reduce((sum, day) => sum + day.ordersCompleted, 0);

    res.json({
      earnings,
      summary: {
        totalEarnings,
        totalOrders,
        averagePerOrder: totalOrders > 0 ? (totalEarnings / totalOrders).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Server error fetching earnings' });
  }
});

// Update driver vehicle information
router.put('/vehicle', auth, requireDriver, [
  body('make').optional().trim().notEmpty().withMessage('Vehicle make is required'),
  body('model').optional().trim().notEmpty().withMessage('Vehicle model is required'),
  body('year').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }).withMessage('Valid year is required'),
  body('plateNumber').optional().trim().notEmpty().withMessage('Plate number is required'),
  body('capacity').optional().isNumeric().isFloat({ min: 100 }).withMessage('Capacity must be at least 100 liters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vehicleUpdates = {};
    const allowedFields = ['make', 'model', 'year', 'plateNumber', 'capacity'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        vehicleUpdates[`driverDetails.vehicleInfo.${field}`] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      vehicleUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Vehicle information updated successfully',
      vehicleInfo: user.driverDetails.vehicleInfo
    });
  } catch (error) {
    console.error('Update vehicle info error:', error);
    res.status(500).json({ message: 'Server error updating vehicle information' });
  }
});

// Get nearby orders (within certain radius)
router.get('/nearby-orders', auth, requireDriver, async (req, res) => {
  try {
    const { radius = 10 } = req.query; // km
    
    if (!req.user.driverDetails?.isApproved || !req.user.driverDetails?.isOnline) {
      return res.status(400).json({ 
        message: 'Driver must be approved and online to view nearby orders' 
      });
    }

    const driverLocation = req.user.driverDetails.currentLocation;
    if (!driverLocation?.latitude || !driverLocation?.longitude) {
      return res.status(400).json({ 
        message: 'Driver location not available. Please update your location.' 
      });
    }

    // Find orders within radius (simplified calculation)
    const orders = await Order.find({
      status: 'confirmed',
      driver: null
    }).populate('customer', 'name phone');

    // Filter orders by distance (basic calculation)
    const nearbyOrders = orders.filter(order => {
      const orderLat = order.deliveryAddress.coordinates.latitude;
      const orderLng = order.deliveryAddress.coordinates.longitude;
      const driverLat = driverLocation.latitude;
      const driverLng = driverLocation.longitude;

      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (orderLat - driverLat) * Math.PI / 180;
      const dLng = (orderLng - driverLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(driverLat * Math.PI / 180) * Math.cos(orderLat * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return distance <= radius;
    });

    res.json({
      orders: nearbyOrders,
      count: nearbyOrders.length,
      radius: `${radius} km`
    });
  } catch (error) {
    console.error('Get nearby orders error:', error);
    res.status(500).json({ message: 'Server error fetching nearby orders' });
  }
});

// Get driver's order history with filters
router.get('/order-history', auth, requireDriver, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      fuelType, 
      startDate, 
      endDate 
    } = req.query;

    const query = { driver: req.userId };

    if (status) {
      query.status = status;
    }

    if (fuelType) {
      query.fuelType = fuelType;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({ message: 'Server error fetching order history' });
  }
});

module.exports = router;