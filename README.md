# FuelDelivery - On-Demand Fuel Delivery Service

A comprehensive fuel delivery application similar to Uber, built with Node.js, Express, MongoDB, React, and Socket.IO for real-time updates.

## 🚀 Features

### For Customers
- **Easy Ordering**: Select fuel type (petrol/diesel), quantity, and delivery location
- **Real-time Tracking**: Track your delivery driver on the map in real-time
- **Multiple Payment Options**: Card, cash, or digital wallet payments
- **Order History**: View all your past orders and receipts
- **Scheduled Delivery**: Option to schedule fuel delivery for later
- **Rating System**: Rate drivers and provide feedback

### For Drivers
- **Driver Dashboard**: Manage availability, view earnings, and track performance
- **Order Management**: Accept/reject orders, update delivery status
- **Real-time Location**: GPS tracking for customers to see driver location
- **Earnings Tracking**: Detailed breakdown of daily, weekly, and monthly earnings
- **Route Optimization**: Get directions to delivery locations

### For Admins
- **Admin Dashboard**: Complete overview of the platform
- **User Management**: Manage customers, drivers, and their accounts
- **Order Monitoring**: Track all orders and their statuses
- **Driver Approval**: Approve/reject driver applications
- **Analytics**: Revenue reports, user statistics, and performance metrics
- **Real-time Updates**: Live monitoring of all platform activities

### Technical Features
- **Real-time Communication**: Socket.IO for live updates
- **Secure Payments**: Stripe integration for secure transactions
- **Authentication**: JWT-based authentication system
- **Responsive Design**: Mobile-first responsive UI
- **Database**: MongoDB with Mongoose ODM
- **File Upload**: Support for driver document uploads
- **Email Notifications**: Automated email notifications
- **Rate Limiting**: API rate limiting for security

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email service

### Frontend
- **React** - Frontend framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time updates
- **Tailwind CSS** - Styling
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Leaflet** - Maps integration
- **Recharts** - Data visualization

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd fuel-delivery-app
```

### 2. Install Server Dependencies
```bash
npm install
```

### 3. Install Client Dependencies
```bash
cd client
npm install
cd ..
```

### 4. Environment Configuration
Create a `.env` file in the root directory and copy the contents from `.env.example`:

```bash
cp .env.example .env
```

Update the environment variables with your actual values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/fuel-delivery

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Google Maps API (Optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 5. Database Setup
Make sure MongoDB is running on your system. The application will automatically create the necessary collections.

### 6. Start the Application

#### Development Mode
```bash
# Start both server and client concurrently
npm run dev

# Or start them separately
# Terminal 1 - Start server
npm run server

# Terminal 2 - Start client
npm run client
```

#### Production Mode
```bash
# Build the client
npm run build

# Start the server
npm start
```

## 📱 Usage

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health

### Default User Roles
The application supports three user types:
1. **Customer** - Can place orders and track deliveries
2. **Driver** - Can accept orders and manage deliveries
3. **Admin** - Can manage the entire platform

### Creating Admin User
To create an admin user, you can either:
1. Register as a customer and manually update the user type in the database
2. Use the registration API with `userType: 'admin'`

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/my-orders` - Get customer orders
- `GET /api/orders/driver-orders` - Get driver orders
- `GET /api/orders/available` - Get available orders for drivers
- `PUT /api/orders/:id/accept` - Accept order (driver)
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/rate` - Rate order

### Drivers
- `PUT /api/drivers/status` - Update online/offline status
- `PUT /api/drivers/location` - Update driver location
- `GET /api/drivers/stats` - Get driver statistics
- `GET /api/drivers/earnings` - Get earnings data
- `PUT /api/drivers/vehicle` - Update vehicle information

### Payments
- `POST /api/payments/create-payment-intent` - Create payment intent
- `POST /api/payments/confirm-payment` - Confirm payment
- `GET /api/payments/status/:orderId` - Get payment status
- `POST /api/payments/refund` - Process refund

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/orders` - All orders with filters
- `GET /api/admin/drivers` - All drivers
- `PUT /api/admin/drivers/:id/approval` - Approve/reject driver
- `GET /api/admin/customers` - All customers
- `GET /api/admin/analytics` - Analytics data

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt for password security
- **Rate Limiting** - Prevent API abuse
- **CORS Protection** - Cross-origin request security
- **Helmet** - Security headers
- **Input Validation** - Request validation middleware
- **Role-based Access** - Different access levels for users

## 🎨 Frontend Features

- **Responsive Design** - Works on all device sizes
- **Real-time Updates** - Live notifications and updates
- **Interactive Maps** - Location selection and tracking
- **Modern UI** - Clean and intuitive interface
- **Progressive Web App** - PWA capabilities
- **Offline Support** - Basic offline functionality

## 📊 Database Schema

### Users Collection
- User authentication and profile information
- Role-based access (customer, driver, admin)
- Driver-specific details (vehicle, documents, ratings)
- Customer preferences and saved addresses

### Orders Collection
- Order details and status tracking
- Payment information and status
- Delivery address and coordinates
- Rating and feedback system
- Comprehensive tracking timeline

## 🚦 Order Flow

1. **Customer Places Order**
   - Select fuel type and quantity
   - Choose delivery location
   - Select payment method
   - Confirm order

2. **Payment Processing**
   - Secure payment via Stripe
   - Order status updated to 'confirmed'

3. **Driver Assignment**
   - Available drivers see the order
   - Driver accepts the order
   - Customer gets driver details

4. **Delivery Process**
   - Driver updates status (en route, arrived, delivering)
   - Real-time location tracking
   - Customer receives live updates

5. **Order Completion**
   - Driver marks order as completed
   - Customer can rate the service
   - Payment is processed (if cash on delivery)

## 🔧 Development

### Project Structure
```
fuel-delivery-app/
├── server/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   └── index.js         # Server entry point
├── client/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   └── App.js       # Main app component
│   └── public/          # Static files
├── package.json         # Server dependencies
└── README.md           # This file
```

### Available Scripts
- `npm run dev` - Start development mode (both server and client)
- `npm run server` - Start server only
- `npm run client` - Start client only
- `npm run build` - Build client for production
- `npm start` - Start production server
- `npm run install-all` - Install all dependencies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions, please:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Contact the development team

## 🚀 Deployment

### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server/index.js --name fuel-delivery

# View logs
pm2 logs fuel-delivery

# Restart application
pm2 restart fuel-delivery
```

### Using Docker
```bash
# Build the image
docker build -t fuel-delivery .

# Run the container
docker run -p 5000:5000 fuel-delivery
```

## 🔮 Future Enhancements

- [ ] Mobile app development (React Native)
- [ ] Advanced route optimization
- [ ] Loyalty program and rewards
- [ ] Multiple fuel stations integration
- [ ] AI-powered demand prediction
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Integration with fleet management systems
- [ ] Advanced driver verification system

---

**Built with ❤️ for efficient fuel delivery management**
