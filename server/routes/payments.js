const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { auth, requireCustomer } = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/create-payment-intent', auth, requireCustomer, [
  body('orderId').isMongoId().withMessage('Valid order ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot pay for cancelled order' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'inr', // Indian Rupees
      metadata: {
        orderId: order._id.toString(),
        customerId: req.userId,
        orderNumber: order.orderNumber
      },
      description: `Fuel delivery - ${order.fuelType} ${order.quantity}L`
    });

    // Update order with payment intent ID
    order.paymentDetails.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Server error creating payment intent' });
  }
});

// Confirm payment
router.post('/confirm-payment', auth, requireCustomer, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('orderId').isMongoId().withMessage('Valid order ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentIntentId, orderId } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Update order payment status
      order.paymentStatus = 'paid';
      order.paymentDetails.transactionId = paymentIntent.id;
      order.paymentDetails.paidAt = new Date();
      order.status = 'confirmed'; // Move to confirmed status after payment
      
      await order.save();

      // Emit payment confirmation to admin dashboard
      const io = req.app.get('io');
      io.emit('paymentConfirmed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        customer: order.customer
      });

      res.json({
        message: 'Payment confirmed successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus
        }
      });
    } else {
      res.status(400).json({
        message: 'Payment not successful',
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Server error confirming payment' });
  }
});

// Webhook for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Find and update order
      const order = await Order.findOne({
        'paymentDetails.stripePaymentIntentId': paymentIntent.id
      });

      if (order) {
        order.paymentStatus = 'paid';
        order.paymentDetails.transactionId = paymentIntent.id;
        order.paymentDetails.paidAt = new Date();
        order.status = 'confirmed';
        await order.save();

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`customer_${order.customer}`).emit('paymentSuccess', {
          orderId: order._id,
          orderNumber: order.orderNumber
        });
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      const failedOrder = await Order.findOne({
        'paymentDetails.stripePaymentIntentId': failedPayment.id
      });

      if (failedOrder) {
        failedOrder.paymentStatus = 'failed';
        await failedOrder.save();

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`customer_${failedOrder.customer}`).emit('paymentFailed', {
          orderId: failedOrder._id,
          orderNumber: failedOrder.orderNumber,
          error: failedPayment.last_payment_error?.message
        });
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Get payment status
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    if (req.user.userType === 'customer' && order.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentDetails
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: 'Server error fetching payment status' });
  }
});

// Process refund
router.post('/refund', auth, [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, reason } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions (customer can request refund, admin can process)
    if (req.user.userType === 'customer' && order.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if order is eligible for refund
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order is not paid, cannot refund' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ message: 'Cannot refund completed orders' });
    }

    // Process refund with Stripe
    if (order.paymentDetails.stripePaymentIntentId) {
      const refund = await stripe.refunds.create({
        payment_intent: order.paymentDetails.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          orderId: order._id.toString(),
          reason: reason || 'Customer requested refund'
        }
      });

      // Update order
      order.paymentStatus = 'refunded';
      order.status = 'cancelled';
      order.tracking.cancelled = {
        timestamp: new Date(),
        reason: reason || 'Refund processed',
        cancelledBy: req.user.userType
      };

      await order.save();

      // Emit refund notification
      const io = req.app.get('io');
      io.to(`customer_${order.customer}`).emit('refundProcessed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        refundAmount: order.totalAmount
      });

      res.json({
        message: 'Refund processed successfully',
        refundId: refund.id,
        amount: refund.amount / 100 // Convert back from cents
      });
    } else {
      return res.status(400).json({ message: 'No payment record found for refund' });
    }
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Server error processing refund' });
  }
});

module.exports = router;