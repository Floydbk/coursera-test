const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerLiter: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    landmark: String,
    instructions: String
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'driver_assigned',
      'driver_en_route',
      'arrived',
      'delivering',
      'completed',
      'cancelled'
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'wallet'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    stripePaymentIntentId: String,
    paidAt: Date
  },
  scheduledDelivery: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    scheduledTime: Date
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryFee: {
    type: Number,
    default: 0
  },
  taxes: {
    type: Number,
    default: 0
  },
  discount: {
    code: String,
    amount: {
      type: Number,
      default: 0
    }
  },
  tracking: {
    orderPlaced: {
      timestamp: {
        type: Date,
        default: Date.now
      },
      location: {
        latitude: Number,
        longitude: Number
      }
    },
    driverAssigned: {
      timestamp: Date,
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    driverEnRoute: {
      timestamp: Date,
      estimatedArrival: Date
    },
    arrived: {
      timestamp: Date,
      location: {
        latitude: Number,
        longitude: Number
      }
    },
    delivering: {
      timestamp: Date
    },
    completed: {
      timestamp: Date,
      signature: String,
      photo: String
    },
    cancelled: {
      timestamp: Date,
      reason: String,
      cancelledBy: {
        type: String,
        enum: ['customer', 'driver', 'admin']
      }
    }
  },
  rating: {
    customerRating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      ratedAt: Date
    },
    driverRating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      ratedAt: Date
    }
  },
  notes: {
    customerNotes: String,
    driverNotes: String,
    adminNotes: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `FD${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ driver: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);