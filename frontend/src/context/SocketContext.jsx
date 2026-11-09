import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'disconnected'
  const [lastEvent, setLastEvent] = useState(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Maintain stable socket reference to prevent duplicate instantiations
  const socketRef = useRef(null);

  useEffect(() => {
    // If no authenticated token or user, tear down existing socket
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnectionStatus('disconnected');
      }
      return;
    }

    setConnectionStatus('connecting');

    // Create single socket instance authenticated via handshake
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually if needed
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      setConnectionStatus('disconnected');
      console.warn('[SocketContext] Connection error:', err.message);
    });

    // Listen to live notification events to bump unread badge
    newSocket.on('notification:received', () => {
      setUnreadNotificationsCount((prev) => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  // Hook helper to subscribe to any socket event with automatic cleanup
  const useSocketEvent = useCallback(
    (eventName, handler) => {
      useEffect(() => {
        if (!socket || !eventName || !handler) return;

        const wrappedHandler = (...args) => {
          setLastEvent({ name: eventName, timestamp: Date.now() });
          handler(...args);
        };

        socket.on(eventName, wrappedHandler);

        return () => {
          socket.off(eventName, wrappedHandler);
        };
      }, [socket, eventName, handler]);
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectionStatus,
        lastEvent,
        useSocketEvent,
        unreadNotificationsCount,
        setUnreadNotificationsCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
