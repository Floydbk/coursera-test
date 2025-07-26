const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth, requireCustomer, requireDriver } = require('../middleware/auth');

const router = express.Router();

// Create new order
router.post('/', auth, requireCustomer, [
  body('fuelType').isIn(['petrol', 'diesel']).withMessage('Invalid fuel type'),
  body('quantity').isNumeric().isFloat({ min: 1 }).withMessage('Quantity must be at least 1 liter'),
  body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').notEmpty().withMessage('State is required'),
  body('deliveryAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('deliveryAddress.coordinates.latitude').isNumeric().withMessage('Valid latitude is required'),
  body('deliveryAddress.coordinates.longitude').isNumeric().withMessage('Valid longitude is required'),
  body('paymentMethod').isIn(['card', 'cash', 'wallet']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      fuelType,
      quantity,
      deliveryAddress,
      paymentMethod,
      scheduledDelivery,
      customerNotes
    } = req.body;

    // Get current fuel prices (in a real app, this would come from a pricing service)
    const pricePerLiter = fuelType === 'petrol' ? 95.50 : 89.75; // Example prices
    const baseAmount = quantity * pricePerLiter;
    const deliveryFee = 50; // Fixed delivery fee
    const taxes = baseAmount * 0.18; // 18% tax
    const totalAmount = baseAmount + deliveryFee + taxes;

    const order = new Order({
      customer: req.userId,
      fuelType,
      quantity,
      pricePerLiter,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      deliveryFee,
      taxes,
      scheduledDelivery,
      notes: {
        customerNotes
      },
      estimatedDeliveryTime: scheduledDelivery?.isScheduled 
        ? scheduledDelivery.scheduledTime 
        : new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    });

    await order.save();

    // Populate customer details
    await order.populate('customer', 'name phone email');

    // Emit order created event to admin dashboard
    const io = req.app.get('io');
    io.emit('newOrder', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      fuelType: order.fuelType,
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress
    });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
});

// Get customer's orders
router.get('/my-orders', auth, requireCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { customer: req.userId };
    
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('driver', 'name phone driverDetails.rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Get driver's assigned orders
router.get('/driver-orders', auth, requireDriver, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { driver: req.userId };
    
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone address')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Fetch driver orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
});

// Get available orders for drivers
router.get('/available', auth, requireDriver, async (req, res) => {
  try {
    // Check if driver is approved and online
    if (!req.user.driverDetails?.isApproved) {
      return res.status(403).json({ message: 'Driver not approved yet' });
    }

    if (!req.user.driverDetails?.isOnline) {
      return res.status(400).json({ message: 'Driver must be online to view available orders' });
    }

    const orders = await Order.find({
      status: 'confirmed',
      driver: null
    })
    .populate('customer', 'name phone')
    .sort({ createdAt: 1 });

    res.json({ orders });
  } catch (error) {
    console.error('Fetch available orders error:', error);
    res.status(500).json({ message: 'Server error fetching available orders' });
  }
});

// Accept order (driver)
router.put('/:orderId/accept', auth, requireDriver, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'confirmed' || order.driver) {
      return res.status(400).json({ message: 'Order not available for acceptance' });
    }

    // Update order
    order.driver = req.userId;
    order.status = 'driver_assigned';
    order.tracking.driverAssigned = {
      timestamp: new Date(),
      driverId: req.userId
    };

    await order.save();
    await order.populate(['customer', 'driver']);

    // Notify customer
    const io = req.app.get('io');
    io.to(`customer_${order.customer._id}`).emit('orderUpdate', {
      orderId: order._id,
      status: 'driver_assigned',
      driver: order.driver
    });

    res.json({
      message: 'Order accepted successfully',
      order
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ message: 'Server error accepting order' });
  }
});

// Update order status
router.put('/:orderId/status', auth, [
  body('status').isIn([
    'driver_en_route',
    'arrived',
    'delivering',
    'completed',
    'cancelled'
  ]).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, location, signature, photo, cancelReason } = req.body;
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    if (req.user.userType === 'driver' && order.driver.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    if (req.user.userType === 'customer' && order.customer.toString() !== req.userId && status !== 'cancelled') {
      return res.status(403).json({ message: 'Customers can only cancel orders' });
    }

    // Update order status and tracking
    order.status = status;
    
    switch (status) {
      case 'driver_en_route':
        order.tracking.driverEnRoute = {
          timestamp: new Date(),
          estimatedArrival: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        };
        break;
      case 'arrived':
        order.tracking.arrived = {
          timestamp: new Date(),
          location
        };
        break;
      case 'delivering':
        order.tracking.delivering = {
          timestamp: new Date()
        };
        break;
      case 'completed':
        order.tracking.completed = {
          timestamp: new Date(),
          signature,
          photo
        };
        order.actualDeliveryTime = new Date();
        order.paymentStatus = order.paymentMethod === 'cash' ? 'paid' : order.paymentStatus;
        break;
      case 'cancelled':
        order.tracking.cancelled = {
          timestamp: new Date(),
          reason: cancelReason,
          cancelledBy: req.user.userType
        };
        break;
    }

    await order.save();
    await order.populate(['customer', 'driver']);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`customer_${order.customer._id}`).emit('orderUpdate', {
      orderId: order._id,
      status,
      tracking: order.tracking
    });

    if (order.driver) {
      io.to(`driver_${order.driver._id}`).emit('orderUpdate', {
        orderId: order._id,
        status,
        tracking: order.tracking
      });
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// Get order details
router.get('/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('customer', 'name phone email')
      .populate('driver', 'name phone driverDetails.rating driverDetails.vehicleInfo');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    if (req.user.userType === 'customer' && order.customer._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    if (req.user.userType === 'driver' && (!order.driver || order.driver._id.toString() !== req.userId)) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Fetch order details error:', error);
    res.status(500).json({ message: 'Server error fetching order details' });
  }
});

// Rate order
router.post('/:orderId/rate', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed orders' });
    }

    if (req.user.userType === 'customer') {
      if (order.customer.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to rate this order' });
      }

      if (order.rating.customerRating.score) {
        return res.status(400).json({ message: 'Order already rated' });
      }

      order.rating.customerRating = {
        score: rating,
        comment,
        ratedAt: new Date()
      };

      // Update driver's overall rating
      if (order.driver) {
        const driver = await User.findById(order.driver);
        if (driver) {
          const currentRating = driver.driverDetails.rating || 0;
          const totalRatings = driver.driverDetails.totalRatings || 0;
          
          const newTotalRatings = totalRatings + 1;
          const newRating = ((currentRating * totalRatings) + rating) / newTotalRatings;
          
          driver.driverDetails.rating = newRating;
          driver.driverDetails.totalRatings = newTotalRatings;
          await driver.save();
        }
      }
    } else if (req.user.userType === 'driver') {
      if (!order.driver || order.driver.toString() !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to rate this order' });
      }

      if (order.rating.driverRating.score) {
        return res.status(400).json({ message: 'Order already rated' });
      }

      order.rating.driverRating = {
        score: rating,
        comment,
        ratedAt: new Date()
      };
    }

    await order.save();

    res.json({
      message: 'Rating submitted successfully',
      rating: req.user.userType === 'customer' ? order.rating.customerRating : order.rating.driverRating
    });
  } catch (error) {
    console.error('Rate order error:', error);
    res.status(500).json({ message: 'Server error submitting rating' });
  }
});

module.exports = router;