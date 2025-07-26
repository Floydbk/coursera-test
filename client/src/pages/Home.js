import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  TruckIcon, 
  ClockIcon, 
  ShieldCheckIcon, 
  MapPinIcon,
  PhoneIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: TruckIcon,
      title: 'Fast Delivery',
      description: 'Get fuel delivered to your location within 60 minutes'
    },
    {
      icon: ClockIcon,
      title: '24/7 Service',
      description: 'Available round the clock for your fuel needs'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Quality Assured',
      description: 'Premium quality petrol and diesel from trusted sources'
    },
    {
      icon: MapPinIcon,
      title: 'Real-time Tracking',
      description: 'Track your delivery driver in real-time on the map'
    },
    {
      icon: PhoneIcon,
      title: 'Easy Ordering',
      description: 'Simple and intuitive ordering process via mobile app'
    },
    {
      icon: CreditCardIcon,
      title: 'Secure Payment',
      description: 'Multiple payment options with secure transactions'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Place Order',
      description: 'Select fuel type, quantity, and delivery location'
    },
    {
      step: 2,
      title: 'Make Payment',
      description: 'Pay securely using card, wallet, or cash on delivery'
    },
    {
      step: 3,
      title: 'Track Delivery',
      description: 'Monitor your delivery driver in real-time'
    },
    {
      step: 4,
      title: 'Receive Fuel',
      description: 'Get your fuel delivered directly to your location'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Fuel Delivery at Your Doorstep
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Get premium quality petrol and diesel delivered to your location with just a few clicks
            </p>
            {!user ? (
              <div className="space-x-4">
                <Link
                  to="/register"
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
                >
                  Login
                </Link>
              </div>
            ) : (
              <Link
                to="/dashboard"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose FuelDelivery?
            </h2>
            <p className="text-xl text-gray-600">
              Experience the convenience of on-demand fuel delivery
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition duration-300">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple steps to get fuel delivered to your location
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              No hidden charges, competitive rates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-green-400 to-green-600 text-white p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">Petrol</h3>
              <div className="text-4xl font-bold mb-2">₹95.50</div>
              <div className="text-green-100 mb-4">per liter</div>
              <ul className="space-y-2">
                <li>✓ Premium quality</li>
                <li>✓ Fast delivery</li>
                <li>✓ Real-time tracking</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">Diesel</h3>
              <div className="text-4xl font-bold mb-2">₹89.75</div>
              <div className="text-orange-100 mb-4">per liter</div>
              <ul className="space-y-2">
                <li>✓ High-grade diesel</li>
                <li>✓ Quick delivery</li>
                <li>✓ Live tracking</li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              + ₹50 delivery fee + 18% GST
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of satisfied customers who trust FuelDelivery
          </p>
          {!user ? (
            <div className="space-x-4">
              <Link
                to="/register?type=customer"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
              >
                Order Now
              </Link>
              <Link
                to="/register?type=driver"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
              >
                Become a Driver
              </Link>
            </div>
          ) : user.userType === 'customer' ? (
            <Link
              to="/order-fuel"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
            >
              Order Fuel Now
            </Link>
          ) : (
            <Link
              to="/dashboard"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition duration-300"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;