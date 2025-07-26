const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    enum: ['customer', 'driver', 'admin'],
    default: 'customer'
  },
  profileImage: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // Driver-specific fields
  driverDetails: {
    licenseNumber: String,
    vehicleInfo: {
      make: String,
      model: String,
      year: Number,
      plateNumber: String,
      capacity: Number // in liters
    },
    documents: {
      license: String,
      insurance: String,
      registration: String
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    currentLocation: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date
    },
    rating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  // Customer-specific fields
  customerDetails: {
    preferredPaymentMethod: {
      type: String,
      enum: ['card', 'cash', 'wallet'],
      default: 'card'
    },
    savedAddresses: [{
      label: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);