import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserIcon, 
  TruckIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const getNavLinks = () => {
    if (!user) {
      return (
        <>
          <Link
            to="/"
            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/login"
            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Login
          </Link>
          <Link
            to="/register"
            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Register
          </Link>
        </>
      );
    }

    const commonLinks = (
      <>
        <Link
          to="/dashboard"
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <HomeIcon className="h-4 w-4 mr-1" />
          Dashboard
        </Link>
        <Link
          to="/profile"
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <UserIcon className="h-4 w-4 mr-1" />
          Profile
        </Link>
      </>
    );

    const customerLinks = (
      <>
        {commonLinks}
        <Link
          to="/order-fuel"
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
          onClick={() => setIsOpen(false)}
        >
          <TruckIcon className="h-4 w-4 mr-1" />
          Order Fuel
        </Link>
      </>
    );

    const driverLinks = (
      <>
        {commonLinks}
        <span className="text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center">
          <ClipboardDocumentListIcon className="h-4 w-4 mr-1" />
          Driver Portal
        </span>
      </>
    );

    const adminLinks = (
      <>
        {commonLinks}
        <span className="text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center">
          <Cog6ToothIcon className="h-4 w-4 mr-1" />
          Admin Panel
        </span>
      </>
    );

    switch (user.userType) {
      case 'customer':
        return customerLinks;
      case 'driver':
        return driverLinks;
      case 'admin':
        return adminLinks;
      default:
        return commonLinks;
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <TruckIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">FuelDelivery</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {getNavLinks()}
            
            {user && (
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="ml-1 text-xs text-gray-500">
                    {connected ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                {/* User Info */}
                <div className="flex items-center text-sm text-gray-700">
                  <UserIcon className="h-4 w-4 mr-1" />
                  <span>{user.name}</span>
                  <span className="ml-1 text-xs bg-gray-200 px-2 py-1 rounded">
                    {user.userType}
                  </span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
            {getNavLinks()}
            
            {user && (
              <div className="border-t border-gray-200 pt-4 pb-3">
                <div className="flex items-center px-3">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400 capitalize">{user.userType}</div>
                  </div>
                  <div className="ml-auto flex items-center">
                    <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;