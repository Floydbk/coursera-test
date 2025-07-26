import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Connected to server');
        
        // Join user-specific room
        newSocket.emit('join', {
          userType: user.userType,
          userId: user._id
        });
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        console.log('Disconnected from server');
      });

      // Listen for order updates
      newSocket.on('orderUpdate', (data) => {
        toast.success(`Order ${data.orderId} status updated to: ${data.status}`);
      });

      // Listen for driver location updates (for customers)
      newSocket.on('driverLocationUpdate', (data) => {
        // This will be handled by individual components that need location updates
        console.log('Driver location updated:', data);
      });

      // Listen for payment updates
      newSocket.on('paymentSuccess', (data) => {
        toast.success(`Payment successful for order ${data.orderNumber}`);
      });

      newSocket.on('paymentFailed', (data) => {
        toast.error(`Payment failed for order ${data.orderNumber}: ${data.error}`);
      });

      // Driver-specific events
      if (user.userType === 'driver') {
        newSocket.on('approvalStatusUpdate', (data) => {
          if (data.isApproved) {
            toast.success('Your driver account has been approved!');
          } else {
            toast.error(`Your driver account was rejected: ${data.rejectionReason}`);
          }
        });
      }

      // Admin-specific events
      if (user.userType === 'admin') {
        newSocket.on('newOrder', (data) => {
          toast.success(`New order received: ${data.orderNumber}`);
        });

        newSocket.on('paymentConfirmed', (data) => {
          toast.success(`Payment confirmed for order ${data.orderNumber}`);
        });
      }

      // Account status updates
      newSocket.on('accountStatusUpdate', (data) => {
        if (data.isActive) {
          toast.success('Your account has been activated');
        } else {
          toast.error(`Your account has been deactivated: ${data.reason}`);
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user]);

  const emitLocationUpdate = (locationData) => {
    if (socket && connected) {
      socket.emit('updateLocation', locationData);
    }
  };

  const emitOrderStatusUpdate = (statusData) => {
    if (socket && connected) {
      socket.emit('orderStatusUpdate', statusData);
    }
  };

  const value = {
    socket,
    connected,
    emitLocationUpdate,
    emitOrderStatusUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};