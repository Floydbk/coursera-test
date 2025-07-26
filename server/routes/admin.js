const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get daily stats
    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } },
          petrolOrders: { $sum: { $cond: [{ $eq: ['$fuelType', 'petrol'] }, 1, 0] } },
          dieselOrders: { $sum: { $cond: [{ $eq: ['$fuelType', 'diesel'] }, 1, 0] } }
        }
      }
    ]);

    // Get monthly stats
    const monthlyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } }
        }
      }
    ]);

    // Get user counts
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get online drivers count
    const onlineDrivers = await User.countDocuments({
      userType: 'driver',
      'driverDetails.isOnline': true,
      'driverDetails.isApproved': true
    });

    // Get pending driver approvals
    const pendingDrivers = await User.countDocuments({
      userType: 'driver',
      'driverDetails.isApproved': false
    });

    // Get active orders count
    const activeOrders = await Order.countDocuments({
      status: { $in: ['confirmed', 'driver_assigned', 'driver_en_route', 'arrived', 'delivering'] }
    });

    const userCountMap = userCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      daily: dailyStats[0] || {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        petrolOrders: 0,
        dieselOrders: 0
      },
      monthly: monthlyStats[0] || {
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0
      },
      users: {
        customers: userCountMap.customer || 0,
        drivers: userCountMap.driver || 0,
        admins: userCountMap.admin || 0
      },
      drivers: {
        online: onlineDrivers,
        pendingApproval: pendingDrivers
      },
      activeOrders
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard statistics' });
  }
});

// Get all orders with filters
router.get('/orders', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      fuelType,
      startDate,
      endDate,
      search
    } = req.query;

    let query = {};

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

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone email')
      .populate('driver', 'name phone driverDetails.rating')
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
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Get all drivers
router.get('/drivers', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, approved } = req.query;

    let query = { userType: 'driver' };

    if (status === 'online') {
      query['driverDetails.isOnline'] = true;
    } else if (status === 'offline') {
      query['driverDetails.isOnline'] = false;
    }

    if (approved === 'true') {
      query['driverDetails.isApproved'] = true;
    } else if (approved === 'false') {
      query['driverDetails.isApproved'] = false;
    }

    const drivers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      drivers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Server error fetching drivers' });
  }
});

// Approve/reject driver
router.put('/drivers/:driverId/approval', auth, requireAdmin, [
  body('isApproved').isBoolean().withMessage('isApproved must be a boolean'),
  body('rejectionReason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isApproved, rejectionReason } = req.body;
    const { driverId } = req.params;

    const driver = await User.findOne({
      _id: driverId,
      userType: 'driver'
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.driverDetails.isApproved = isApproved;
    
    if (!isApproved && rejectionReason) {
      driver.driverDetails.rejectionReason = rejectionReason;
    }

    await driver.save();

    // Emit notification to driver
    const io = req.app.get('io');
    io.to(`driver_${driverId}`).emit('approvalStatusUpdate', {
      isApproved,
      rejectionReason: rejectionReason || null
    });

    res.json({
      message: `Driver ${isApproved ? 'approved' : 'rejected'} successfully`,
      driver: {
        id: driver._id,
        name: driver.name,
        isApproved: driver.driverDetails.isApproved
      }
    });
  } catch (error) {
    console.error('Driver approval error:', error);
    res.status(500).json({ message: 'Server error updating driver approval' });
  }
});

// Get all customers
router.get('/customers', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let query = { userType: 'customer' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get order count for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderCount = await Order.countDocuments({ customer: customer._id });
        const totalSpent = await Order.aggregate([
          { $match: { customer: customer._id, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        return {
          ...customer.toObject(),
          stats: {
            totalOrders: orderCount,
            totalSpent: totalSpent[0]?.total || 0
          }
        };
      })
    );

    res.json({
      customers: customersWithStats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

// Get analytics data
router.get('/analytics', auth, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily revenue trend
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Fuel type distribution
    const fuelTypeStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$fuelType',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    // Top performing drivers
    const topDrivers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed',
          driver: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$driver',
          completedOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalFuelDelivered: { $sum: '$quantity' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver'
        }
      },
      {
        $unwind: '$driver'
      },
      {
        $project: {
          driverName: '$driver.name',
          driverRating: '$driver.driverDetails.rating',
          completedOrders: 1,
          totalRevenue: 1,
          totalFuelDelivered: 1
        }
      },
      {
        $sort: { completedOrders: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Order status distribution
    const orderStatusStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      period: `${days} days`,
      dailyRevenue,
      fuelTypeStats,
      topDrivers,
      orderStatusStats
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// Update order status (admin override)
router.put('/orders/:orderId/status', auth, requireAdmin, [
  body('status').isIn([
    'pending',
    'confirmed',
    'driver_assigned',
    'driver_en_route',
    'arrived',
    'delivering',
    'completed',
    'cancelled'
  ]).withMessage('Invalid status'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reason } = req.body;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;

    // Add admin note
    if (reason) {
      order.notes.adminNotes = reason;
    }

    // Update tracking based on status
    if (status === 'cancelled') {
      order.tracking.cancelled = {
        timestamp: new Date(),
        reason: reason || 'Cancelled by admin',
        cancelledBy: 'admin'
      };
    }

    await order.save();
    await order.populate(['customer', 'driver']);

    // Emit real-time updates
    const io = req.app.get('io');
    io.to(`customer_${order.customer._id}`).emit('orderUpdate', {
      orderId: order._id,
      status,
      reason
    });

    if (order.driver) {
      io.to(`driver_${order.driver._id}`).emit('orderUpdate', {
        orderId: order._id,
        status,
        reason
      });
    }

    res.json({
      message: 'Order status updated successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        oldStatus,
        newStatus: status
      }
    });
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// Deactivate/activate user
router.put('/users/:userId/status', auth, requireAdmin, [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isActive, reason } = req.body;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.userId) {
      return res.status(400).json({ message: 'Cannot change your own status' });
    }

    user.isActive = isActive;
    await user.save();

    // Emit notification to user
    const io = req.app.get('io');
    io.to(`${user.userType}_${userId}`).emit('accountStatusUpdate', {
      isActive,
      reason: reason || null
    });

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        userType: user.userType,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

module.exports = router;